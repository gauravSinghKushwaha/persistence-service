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
        if (options.error && options.error.code === 'ECONNREFUSED') {
            // End reconnecting on a specific error and flush all commands with a individual error
            return new Error('The server refused the connection');
        }
        if (options.total_retry_time > retryTime) {
            // End reconnecting after a specific timeout and flush all commands with a individual error
            return new Error('Retry time exhausted');
        }
        if (options.times_connected > timesConnected) {
            // End reconnecting with built in error
            return undefined;
        }
        log.info('trying to reconnect with redis');
        // reconnect after
        return Math.min(options.attempt * 100, attempts);
    };

    this.redisClient = redis.createClient(this.con);
    //this.redisClient.unref();

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

function isLegitArr(obj) {
    return obj && null != obj && util.isArray(obj);
}

redisCache.prototype.add = function (key, value, expiry, cb) {
    try {
        var cl = this.redisClient;
        this.get(key, function (err, obj) {
            var val = [];
            if (err) {
                cb(err);
                return;
            } else {
                // value result of some get..so array
                if (isLegitArr(value)) {
                    val = value;
                } else {//value created fresh
                    if (isLegitArr(obj)) {
                        val = obj;
                    }
                    val.push(value);
                }

                cl.set(key, val ? JSON.stringify(val) : val, function (err, res) {
                    if (err) {
                        log.error('ERROR :: cache add ' + err + ' key = ' + key + ' val = ' + val);
                        cb(err);
                    } else {
                        cl.expire(key, (expiry && expiry > 0 ? expiry : 86400), function (err) {
                            if (err) {
                                log.error('ERROR :: cache add expiry' + err + ' key = ' + key);
                            }
                        });
                        log.debug('cache add :: key = ' + key + ' val = ' + val + ' res = ' + res);
                        cb(undefined, res);
                    }
                });
            }
        });
    } catch (e) {
        log.error('REDIS ADD :: ' + e);
        cb(e);
    }
};

redisCache.prototype.get = function (key, cb) {
    try {
        this.redisClient.get(key, function (error, result) {
            if (error) {
                cb(error);
            } else {
                log.debug('get key = ' + key + ' result = ' + result);
                cb(undefined, result ? JSON.parse(result) : result);
            }
        });
    } catch (e) {
        log.error('REDIS GET :: ' + e);
        cb(e);
    }
};

redisCache.prototype.del = function (key, cb) {
    try {
        this.redisClient.del(key, function (error, response) {
            if (error) {
                cb(error);
            } else {
                log.debug('del keys = ' + key + ' response = ' + response);
                cb(undefined, response ? JSON.parse(response) : response);
            }
        });
    } catch (e) {
        log.error('REDIS DEL :: ' + e);
        cb(e);
    }
};


module.exports = new redisCache();
