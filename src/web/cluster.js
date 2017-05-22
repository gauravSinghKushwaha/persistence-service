const path = require('path');
const config = require('./../config/config');
const log = require('./../log/logger');
const cluster = require('cluster');
const os = require('os');
const numWorkers = config.cluster.childprocess != null && config.cluster.childprocess > 0 ? config.cluster.childprocess : os.cpus().length;

/**
 * create chid workes as many as number of cpus, to share load and executes work
 * [description]
 * @param  {[type]} work [description]
 * @return {[type]}      [description]
 */
module.exports.startCluster = function(work) {
  if (cluster.isMaster) {
    log.info('starting cluster with ' + numWorkers + ' threads');
    // spawning child workers
    for (var i = 0; i < numWorkers; i++) {
      var worker = cluster.fork();
      worker.on('message', (message) => {
        log.debug(message);
      });
    }

    cluster.on('online', function(worker) {
      log.info('Worker ' + worker.process.pid + ' is online');
    });

    cluster.on('exit', function(worker, code, signal) {
      log.error('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
      log.error('Starting a new worker');
      cluster.fork();
    });

  } else {
    work();
    process.on('message', (message, handle) => {
      if (message.type == 'shutdown' && message.from == 'master') {
        log.debug('killing worker process');
        process.exit(0);
      } else {
        log.info(message);
      }
    });
  }
}

/**
 * Kills all the workers one by one..
 * [restartWorkers description]
 * @return {[type]} [description]
 */
module.exports.restartWorkers = function restartWorkers() {
  var wid, workerIds = [];
  for (wid in cluster.workers) {
    workerIds.push(wid);
  }
  workerIds.forEach(function(wid) {
    log.debug('wid = ' + wid);
    // sending message to workers from master
    cluster.workers[wid].send({
      type: 'shutdown',
      from: 'master'
    }, () => {
      log.debug('sending shutdown msg to master');
    });
  });
}
