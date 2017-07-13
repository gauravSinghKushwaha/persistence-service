const path = require('path');
const conf = require('./../config/config');
const log = require('./../log/logger');
const cluster = require('cluster');
const os = require('os');
const config = conf.config;
const numWorkers = config.cluster.childprocess != null && config.cluster.childprocess > 0 ? config.cluster.childprocess : os.cpus().length;
const DELAY = 30000;

/**
 * EXIT codes ==>>>>             //https://github.com/nodejs/node-v0.x-archive/blob/master/doc/api/process.markdown#exit-codes
 *
 * create chid workes as many as number of cpus, to share load and executes work
 * [description]
 * @param  {[type]} work [description]
 * @return {[type]}      [description]
 */
module.exports.startCluster = function (work) {
    if (cluster.isMaster) {
        log.info('starting cluster with ' + numWorkers + ' threads');

        // spawning child workers
        for (var i = 0; i < numWorkers; i++) {
            const worker = cluster.fork();
            /*WORKER CLASS EVENTS*/
            worker.on('disconnect', function () {
                log.error('WORKER :: worker disconnected');
            });
            worker.on('error', function (err) {
                log.error('WORKER :: Caught error: = ' + err);
            });
            worker.on('exit', function (code) {
                log.error('WORKER :: process exited with code ' + code);
            });
            worker.on('listening', function (address) {
                log.info('WORKER :: worker listening on address : = ' + JSON.stringify(address));
            });
            worker.on('message', function (message, sendHandle) {
                log.debug('WORKER :: message = ' + JSON.stringify(message), ' sendHandle =' + (sendHandle));
            });
            worker.on('online', function () {
                log.info('WORKER :: worker is online');
            });

            /*CHILD PROCESS EVENTS*/
            const wrkProcess = worker.process;
            wrkProcess.on('disconnect', function () {
                log.error('WRK_PROCESS :: worker disconnected');
            });
            wrkProcess.on('close', function (code, signal) {
                log.error('WRK_PROCESS :: Worker died with code: ' + code + ', and signal: ' + signal);
            });
            wrkProcess.on('error', function (err) {
                log.error('WRK_PROCESS :: Caught error: = ' + JSON.stringify(err));
            });
            wrkProcess.on('close', function (code, signal) {
                log.error('WRK_PROCESS :: Worker died with code: ' + code + ', and signal: ' + signal);
            });
            wrkProcess.on('message', function (message, sendHandle) {
                log.debug('WRK_PROCESS :: message = ' + JSON.stringify(message) + ' sendHandle =' + JSON.stringify(sendHandle));
            });
        }

        cluster.on('disconnect', function (worker) {
            log.error('CLUSTER :: worker id =' + worker.id + ' ,process id = ' + worker.process.pid + ' has disconnected');
        });
        cluster.on('exit', function (worker, code, signal) {
            log.error('CLUSTER :: Worker id =' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
            log.error('CLUSTER :: Starting a new worker in ' + DELAY + ' seconds.');
            setTimeout(function () {
                cluster.fork();
            }, DELAY);
        });
        cluster.on('fork', function (worker) {
            log.info('CLUSTER :: forked new child process = ' + worker.id + ' ,process id = ' + worker.process.pid);
        });
        cluster.on('listening', function (worker, address) {
            log.info('CLUSTER :: worker ' + worker.id + ' ,process id = ' + worker.process.pid + ' listening on ' + JSON.stringify(address));
        });
        cluster.on('message', function (worker, message, handle) {
            log.debug('CLUSTER :: worker ' + worker.id + ' ,process id = ' + worker.process.pid + ' message =' + JSON.stringify(message) + ' handle = ' + JSON.stringify(handle));
        });
        cluster.on('online', function (worker) {
            log.info('CLUSTER :: Worker ' + worker.process.pid + ' is online. Config = ' + JSON.stringify(worker.process.config));
        });
        cluster.on('setup', function (settings) {
            log.info('CLUSTER :: settings ' + JSON.stringify(settings));
        });
    } else {
        work();
        process.on('message', function (message, handle) {
            if (message.type == 'shutdown' && message.from == 'master'
            ) {
                log.debug('PROCESS :: killing worker process');
                process.exit(0);
            }
            else {
                log.info(message);
            }
        });
    }
};

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
    workerIds.forEach(function (wid) {
        log.debug('wid = ' + wid);
        // sending message to workers from master
        cluster.workers[wid].send({
            type: 'shutdown',
            from: 'master'
        }, function () {
            log.debug('sending shutdown msg to master');
        });
    });
}
