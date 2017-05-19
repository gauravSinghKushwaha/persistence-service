const path = require('path');
const config = require('./../config/config.js');
const logger = require('simple-node-logger');

const logDir = config.logs.dir == null ? __dirname : config.logs.dir;
const logFileName = config.logs.filename == null ? 'river-<DATE>.log' : config.logs.filename + '-<DATE>.log';

const opts = {
  //errorEventName: 'error',
  logDirectory: logDir,
  fileNamePattern: logFileName,
  dateFormat: 'YYYY.MM.DD-HH'
};
const log = logger.createRollingFileLogger(opts);
log.setLevel(config.logs.level);
module.exports = log;
//module.exports = logger.createRollingFileLogger(opts).level(config.logs.level);
