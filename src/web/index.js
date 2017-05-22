const cluster = require('./cluster');
const log = require('./../log/logger');

/**
 * Starging a server vai ./server.js in clustering.
 * @type {[type]}
 */
cluster.startCluster(() => {
  const server = require('./server');
  log.info('server started');
});
