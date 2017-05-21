const cluster = require('./cluster');
const log = require('./../log/logger');
cluster.startCluster(() => {
  const server = require('./server');
  log.info('server started');
});
