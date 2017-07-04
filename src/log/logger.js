const conf = require('./../config/config');
const config = conf.config;
const fs = require('fs');
const path = require('path');
const logger = require('simple-node-logger');

const logDir = config.logs.dir == null ? __dirname : config.logs.dir;
const logFileName = config.logs.filename == null ? 'river-<DATE>.log' : config.logs.filename + '-<DATE>.log';

fs.existsSync(logDir) || fs.mkdirSync(logDir);

const opts = {
    logDirectory: logDir,
    fileNamePattern: logFileName,
    dateFormat: 'YYYY.MM.DD',//'YYYY.MM.DD-HH'
    createInterval: function (cb) {
        setInterval(cb, config.logs.rollinterval ? config.logs.rollinterval : 86400000);//milliseconds
    }
};
const log = logger.createRollingFileLogger(opts);
log.setLevel(config.logs.level);
module.exports = log;
