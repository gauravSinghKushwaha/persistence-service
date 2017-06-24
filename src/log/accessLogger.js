const conf = require('./../config/config');
const config = conf.config;
const log = require('./../log/logger');
const fs = require('fs');
const morgan = require('morgan');
const path = require('path');
const rfs = require('rotating-file-stream');
const logDir = config.logs.accesslogdir == null ? __dirname : config.logs.accesslogdir;
const logFileName = config.logs.accesslogfile == null ? 'access.log' : config.logs.accesslogfile;
const custFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :response-time ms :res[content-length] ":referrer" ":user-agent"';

log.debug('access log =' + logDir);
fs.existsSync(logDir) || fs.mkdirSync(logDir);

const accessLogStream = rfs(logFileName, {
    path: logDir,
    size: '10M', // rotate every 10 MegaBytes written
    interval: '1d', // rotate daily
    compress: 'gzip' // compress rotated files
});

accessLogStream.on('error', function (err) {
    log.error('error in access log = ' + err);
});

accessLogStream.on('removed', function (filename, number) {
    log.error('Access log file = ' + filename + ' removed. ' + ' number = ' + number);
});

accessLogStream.on('warning', function (err) {
    log.error('warning in access log = ' + err);
});

/**
 * Writing access logs to file
 * //https://github.com/expressjs/morgan
 * [exports description]
 * @type {[type]}
 */
module.exports = morgan(custFormat, {
    stream: accessLogStream
}, {
    skip: function (req, res) {
        return res.statusCode < -1; // will skip these entries in access logs
    }
});
