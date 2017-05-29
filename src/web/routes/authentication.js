const crypt = require('./../../common/encrypt');
const log = require('./../../log/logger');
const conf = require('./../../config/config');
const con = require('./../../db/connection');
const express = require('express');
const auth = require('basic-auth');
const router = express.Router();
const config = conf.config;
/**
 * Middleware woudl be used for authentication
 * @param  {[type]}   req  [description]
 * @param  {[type]}   res  [description]
 * @param  {Function} next [description]
 * @return {[type]}        [description]
 */
router.use(function timeLog(req, res, next) {
    var credentials = auth(req);
    if (!credentials || credentials.name != config.apiauth.user || credentials.pass != config.apiauth.pwd) {
        log.warn('access denied for credentials = ' + credentials.name + ' pwd = ' + credentials.pass);
        res.status(401);
        res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
        return res.send('{success:Access denied}');
    }
    next();
});

router.route('/authenticate').post(function (req, res) {
    con.execute(con.READ, function (err, connection) {
            if (err) {
                log.error(err);
                throw err;
            }
            connection.query('SELECT * from river.user', function (error, results, fields) {
                connection.release();
                if (error) {
                    log.error(error);
                    throw error;
                }
                log.debug(results);
            });
        }
    );

    log.debug('request body = ' + JSON.stringify(req.body));
    const hash = crypt.hashText(req.body.username + ':' + req.body.password + ':' + req.body.domain + ':' + req.body.resource);
    if (hash == hash) {
        return res.status(200).send('{success:true}');
    } else {
        return res.status(401).send('{success:Access denied}');
    }
});

router.route('/password').get(function (req, res) {
    res.status(200).send('{password:password}');
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
