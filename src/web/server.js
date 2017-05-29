const conf = require('./../config/config');
const config = conf.config;const log = require('./../log/logger');
const morgan = require('./../log/accessLogger');
const router = require('./routes/authentication')
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(helmet());
app.use(compression());
app.use(morgan);
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

app.use('/river/' + config.web.version, router);

const server = app.listen(config.web.port, function() {
  var host = server.address().address;
  var port = server.address().port;
  log.info('server listening at http://' + host + ':' + port);
});

module.exports = server;
