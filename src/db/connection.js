const conf = require('./../config/config');
const log = require('./../log/logger');
const mysql = require('mysql');

function Cluster() {
    this.READ = 'SLAVE';
    this.WRITE = 'MASTER';
    this.allSlaves = this.READ + '*';
    this.allMasters = this.WRITE + '*';

    this.config = conf.dbconfig;
    this.masters = this.config.masters;
    this.slaves = this.config.slaves;
    this.mysql = mysql;
    log.info('slaves config = ' + JSON.stringify(this.slaves));
    log.info('masters config = ' + JSON.stringify(this.masters));

    this.cluster = this.mysql.createPoolCluster();
    for (i = 0; i < this.masters.length; i++) {
        const value = this.masters[i];
        this.cluster.add(this.WRITE + value.id, value);
    }
    for (i = 0; i < this.slaves.length; i++) {
        const value = this.slaves[i];
        this.cluster.add(this.READ + value.id, value);
    }
}

Cluster.prototype.execute = function (mode, work) {
    const m = (mode == this.READ ? this.allSlaves : this.allMasters);
    log.debug("mode = " + mode + ' allSlaves ' + this.allSlaves + ' allMasters ' + this.allMasters + ' m = ' + JSON.stringify(m));
    this.cluster.getConnection(m, function (err, connection) {
        if (err) {
            log.error(err);
            if (connection) connection.release();
            return work(err);
        }
        work(null, connection);
    });
};

Cluster.prototype.readPool = function () {
    return this.cluster.of(this.allSlaves)
};

Cluster.prototype.writePool = function () {
    return this.cluster.of(this.allMasters);
};


module.exports = new Cluster();
