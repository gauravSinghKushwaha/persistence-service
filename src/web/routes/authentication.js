const express = require('express');
const crypt = require('./../../common/encrypt');
const router = express.Router();
const log = require('./../../log/logger');

/**
 * Middleware woudl be used for authentication
 * @param  {[type]}   req  [description]
 * @param  {[type]}   res  [description]
 * @param  {Function} next [description]
 * @return {[type]}        [description]
 */
router.use(function timeLog(req, res, next) {
  log.debug('Time: ', Date.now());
  next();
});

router.route('/authenticate').post(function(req, res) {
  log.debug('request body = ' + JSON.stringify(req.body));
  const hash = crypt.hashText(req.body.username + ':' + req.body.password + ':' + req.body.domain + ':' + req.body.resource);
  if (hash == hash) {
    res.status(200).send('{success:true}');
  } else {
    res.status(401).send('{success:true}');
  }
});

router.route('/password').get(function(req, res) {
  res.status(200).send('{success:true}');
});

/*
apiRoutes.post('/authenticate', function(req, res) {

  // find the user
  User.findOne({
    name: req.body.name
  }, function(err, user) {

    if (err) throw err;

    if (!user) {
      res.json({
        success: false,
        message: 'Authentication failed. User not found.'
      });
    } else if (user) {

      // check if password matches
      if (user.password != req.body.password) {
        res.json({
          success: false,
          message: 'Authentication failed. Wrong password.'
        });
      } else {

        // if user is found and password is right
        // create a token
        var token = jwt.sign(user, app.get('superSecret'), {
          expiresInMinutes: 1440 // expires in 24 hours
        });

        // return the information including token as JSON
        res.json({
          success: true,
          message: 'Enjoy your token!',
          token: token
        });
      }

    }

  });
});
*/
module.exports = router;
