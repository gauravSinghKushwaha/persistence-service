const conf = require('./../config/config');
const config = conf.config;
const fs = require('fs');
const path = require('path');
const logger = require('simple-node-logger');

const logDir = config.logs.dir == null ? __dirname : config.logs.dir;
const logFileName = config.logs.filename == null ? 'river-<DATE>.log' : config.logs.filename + '-<DATE>.log';

fs.existsSync(logDir) || fs.mkdirSync(logDir);

const opts = {
    //errorEventName: 'error',
    logDirectory: logDir,
    fileNamePattern: logFileName,
    dateFormat: 'YYYY.MM.DD-HH',
    size: '10M', // rotate every 10 MegaBytes written
    interval: '1d', // rotate daily
    compress: 'gzip' // compress rotated files

};
const log = logger.createRollingFileLogger(opts);
log.setLevel(config.logs.level);
module.exports = log;
