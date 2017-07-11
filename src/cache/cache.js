const util = require('util');
const conf = require('./../config/config').config;
const log = require('./../log/logger');
const redis = require("redis");

function redisCache() {
    this.con = conf.redis.connection;
    this.retry = conf.redis.retry;
    const retryTime = this.retry.total_retry_time;
    const timesConnected = this.retry.times_connected;
    const attempts = this.retry.attempt;

    this.con.retry_strategy = function (options) {

        // End reconnecting on a specific error and flush all commands with a individual error
        if (options.error && options.error.code === 'ECONNREFUSED') {
            return new Error('The server refused the connection');
        }

        // End reconnecting after a specific timeout and flush all commands with a individual error
        if (options.total_retry_time > retryTime) {
            return new Error('Retry time exhausted');
        }

        // End reconnecting with built in error
        if (options.times_connected > timesConnected) {
            return undefined;
        }
        log.info('trying to reconnect with redis');
        // reconnect after
        return Math.min(options.attempt * 100, attempts);
    };

    this.redisClient = redis.createClient(this.con);
    this.redisClient.unref();

    this.redisClient.on('ready', function () {
        log.info("Redis is ready");
    });

    this.redisClient.on('connect', function () {
        log.info("connection established Redis");
    });

    this.redisClient.on('end', function (err) {
        log.error("Ending connection to Redis");
        if (err) {
            log.error(err);
        }
    });

    this.redisClient.on('reconnecting', function () {
        log.info("Trying to reconnect to Redis");
    });

    this.redisClient.on('error', function (err) {
        log.error("Error in Redis");
        if (err) {
            log.error(err);
        }
    });
}

function isConnected(rc) {
    return rc && rc.connected == true;
}

function isLegitArr(obj) {
    return obj && null != obj && util.isArray(obj);
}

redisCache.prototype.add = function (key, value, expiry, cb) {
    try {
        const rc = this.redisClient;
        if (isLegitArr(value)) { // value result of some get..so array
            setToCache(value, rc);
        } else {
            this.get(key, function (err, obj) {
                var val = [];
                if (err) {
                    cb(err);
                    return;
                } else {
                    if (isLegitArr(obj)) {
                        val = obj;
                    }
                    val.push(value);
                }
                setToCache(val, rc);
            });
        }
    } catch (e) {
        log.error('REDIS ADD :: ' + e);
        cb(e);
    }

    function setToCache(val, rc) {
        if (!isConnected(rc)) {
            cb(new Error('Redis connection is broken'));
            return;
        }
        rc.set(key, JSON.stringify(val), function (err, res) {
            if (err) {
                log.error('ERROR :: cache add ' + err + ' key = ' + key + ' val = ' + val);
                cb(err);
            } else {
                rc.expire(key, (expiry && expiry > 0 ? expiry : 86400), function (err) {
                    if (err) {
                        log.error('ERROR :: cache add expiry' + err + ' key = ' + key);
                    }
                });
                log.debug('redis add :: key = ' + key + ' val = ' + val + ' res = ' + res);
                cb(undefined, res);
            }
        });
    }
};

redisCache.prototype.get = function (key, cb) {
    try {
        if (!isConnected(this.redisClient)) {
            cb(new Error('Redis connection is broken'));
            return;
        }
        this.redisClient.get(key, function (error, result) {
            if (error) {
                cb(error);
            } else {
                log.debug('redis get :: key = ' + key + ' result = ' + result);
                cb(undefined, result ? JSON.parse(result) : undefined);
            }
        });
    } catch (e) {
        log.error('REDIS GET :: ' + e);
        cb(e);
    }
};

redisCache.prototype.del = function (key, cb) {
    try {
        if (!isConnected(this.redisClient)) {
            cb(new Error('Redis connection is broken'));
            return;
        }
        this.redisClient.del(key, function (error, response) {
            if (error) {
                cb(error);
            } else {
                log.debug('redis del :: keys = ' + key + ' response = ' + response);
                cb(undefined, response ? JSON.parse(response) : response);
            }
        });
    } catch (e) {
        log.error('REDIS DEL :: ' + e);
        cb(e);
    }
};


redisCache.prototype.exists = function (key, cb) {
    try {
        if (!isConnected(this.redisClient)) {
            cb(new Error('Redis connection is broken'));
            return;
        }
        this.redisClient.exists(key, function (err, reply) {
            if (!err) {
                log.debug('Redis exists ::  Key = ' + key + ( reply == 1 ? '' : ' does not ') + ' exists');
                cb(undefined, reply);
            } else {
                cb(err);
            }
        });
    } catch (e) {
        log.error('REDIS exists :: ' + e);
        cb(e);
    }
};

module.exports = new redisCache();
