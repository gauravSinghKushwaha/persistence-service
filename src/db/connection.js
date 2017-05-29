const conf = require('./../config/config');
const log = require('./../log/logger');
const mysql = require('mysql');

const config = conf.dbconfig;
const masters = config.masters;
const slaves = config.slaves;

exports.READ = 'SLAVE';
exports.WRITE = 'MASTER';

const poolCluster = function () {
    log.info('slaves config = ' + JSON.stringify(slaves));
    log.info('masters config = ' + JSON.stringify(masters));
    var poolCluster = mysql.createPoolCluster();
    masters.forEach(function (value) {
        poolCluster.add(exports.WRITE + value.id, value);
    });
    slaves.forEach(function (value) {
        poolCluster.add(exports.READ + value.id, value);
    });
    return poolCluster;
};
const cluster = poolCluster();

module.exports = {
    allSlaves: exports.READ + '*',
    allMasters: exports.WRITE + '*',
    readPool: cluster.of(this.allSlaves),
    writePool: cluster.of(this.allMasters),
    execute: function (mode, work) {
        log.debug("mode = " + mode);
        cluster.getConnection(mode == exports.READ ? this.allSlaves : this.allMasters, function (err, connection) {
            if (err) {
                return work(err);
            }
            work(null, connection);
        });
    },
    closeConnections: function () {
        cluster.end(function (err) {
            if (err) {
                log.error(' error =' + err);
                throw err;
            }
            log.error('closing database connection cluster');
        });
    }
}
