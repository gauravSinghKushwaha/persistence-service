const express = require('express');
const router = express.Router();
const log = require('./../../log/logger');

router.use(function timeLog(req, res, next) {
  log.debug('Time: ', Date.now());
  next();
});

router.route('/authenticate').post(function(req,res){
  res.json('{success:true}');
});

router.route('/password').get(function(req,res){
  res.json('{success:true}');
});

module.exports = router;
