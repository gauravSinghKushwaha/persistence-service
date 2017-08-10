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

function logNoConnectionWithRedisServer(cb) {
    cb(new Error('Redis connection is broken'));
}

function errorSettingValueToCache(err, key, val, cb) {
    log.error('Redis Add :: err = ' + err + ' for key = ' + key + ' and val = ' + val);
    cb(err);
}

function addExpiryToCacheKey(rc, key, expiry, cb) {
    rc.expire(key, (expiry && expiry > 0 ? expiry : 86400), function (err) {
        if (err) {
            log.debug('Reids :: error add expiry = ' + err + ' for key = ' + key);
            cb(err);
        }
    });
}

function setToRedisCacheWithExpiry(rc, key, val, expiry, cb) {
    rc.set(key, JSON.stringify(val), function (err, res) {
        if (err) {
            errorSettingValueToCache(err, key, val, cb);
        } else {
            addExpiryToCacheKey(rc, key, expiry, function (err) {
                if (err) {
                    log.error('Redis :: error setting expiry =' + err);
                }
            });
            log.debug('redis add :: key = ' + key + ' val = ' + JSON.stringify(val) + ' res = ' + res);
            cb(undefined, res);
        }
    });
}

function addToRedisList(rc, key, val, cb) {
    rc.rpush(key, JSON.stringify(val), function (err, res) {
        cb(err, res);
    });
}

redisCache.prototype.add = function (key, value, expiry, cb) {

    function addObjectToExistingCachedObjectList(existingCachedObjectList) {
        if (isLegitArr(value)) {
            for (i = 0; i < value.length; i++) {
                existingCachedObjectList.push(value[i]);
            }
        } else {
            existingCachedObjectList.push(value);
        }
    }

    try {
        const rc = this.redisClient;
        this.get(key, function (err, obj) {
            if (err) {
                cb(err);
                return;
            } else {
                const existingCachedObjectList = (isLegitArr(obj) ? obj : []);
                addObjectToExistingCachedObjectList(existingCachedObjectList);
                setToCache(existingCachedObjectList, rc);
            }
        });
    } catch (e) {
        log.error('REDIS ADD :: ' + e);
        cb(e);
    }

    function setToCache(val, rc) {
        if (!isConnected(rc)) {
            logNoConnectionWithRedisServer(cb);
            return;
        }
        setToRedisCacheWithExpiry(rc, key, val, expiry, cb);
    }
};

function logErroMessage(errMsg, cb, e) {
    log.error(errMsg);
    cb(e);
}

redisCache.prototype.addToList = function (key, value, cb) {
    try {
        const rc = this.redisClient;
        if (!isConnected(rc)) {
            logNoConnectionWithRedisServer(cb);
            return;
        }
        if (util.isArray(value)) {
            log.debug('redis addToList :: key = ' + key + ' value = ' + JSON.stringify(value));
            value.forEach(function (resource) {
                addToRedisList(rc, key, resource, cb);
            });
        } else {
            log.debug('redis addToList :: key = ' + key + ' value = ' + JSON.stringify(value));
            addToRedisList(rc, key, value, cb);
        }
    } catch (e) {
        logErroMessage('REDIS SADD :: ' + e, cb, e);
    }
};

redisCache.prototype.setExpiry = function (key, expiry, cb) {
    try {
        const rc = this.redisClient;
        if (!isConnected(rc)) {
            logNoConnectionWithRedisServer(cb);
        } else {
            addExpiryToCacheKey(rc, key, expiry, function (err) {
                cb(err);
            });
        }
    } catch (e) {
        logErroMessage('REDIS ADD :: ' + e, cb, e);
    }
};

redisCache.prototype.getListMembers = function (key, cb) {
    try {
        if (!isConnected(this.redisClient)) {
            logNoConnectionWithRedisServer(cb);
        } else {
            this.redisClient.lrange(key, 0, -1, function (error, result) {
                log.debug('redis getListMembers :: key = ' + key + ' result = ' + result + ' error = ' + error);
                const setMembers = (result && result != null && result.length > 0) ? result : undefined;
                const memberArray = [];
                if (setMembers) {
                    for (var i = 0; i < setMembers.length; i++) {
                        memberArray.push(JSON.parse(setMembers[i]));
                    }
                }
                cb(error, setMembers ? memberArray : undefined);
            });
        }
    } catch (e) {
        logErroMessage('REDIS GET LIST :: ' + e, cb, e);
    }
};

redisCache.prototype.get = function (key, cb) {
    try {
        if (!isConnected(this.redisClient)) {
            logNoConnectionWithRedisServer(cb);
        } else {
            this.redisClient.get(key, function (error, result) {
                log.debug('redis get :: key = ' + key + ' result = ' + result + ' error = ' + error);
                cb(error, result ? JSON.parse(result) : undefined);
            });
        }
    } catch (e) {
        logErroMessage('REDIS GET :: ' + e, cb, e);
    }
};

redisCache.prototype.del = function (key, cb) {
    try {
        if (!isConnected(this.redisClient)) {
            logNoConnectionWithRedisServer(cb);
        } else {
            this.redisClient.del(key, function (error, response) {
                log.debug('redis del :: keys = ' + key + ' response = ' + response + ' error = ' + error);
                cb(error, response ? JSON.parse(response) : response);
            });
        }
    } catch (e) {
        logErroMessage('REDIS DEL :: ' + e, cb, e);
    }
};


redisCache.prototype.exists = function (key, cb) {
    try {
        if (!isConnected(this.redisClient)) {
            logNoConnectionWithRedisServer(cb);
        } else {
            this.redisClient.exists(key, function (err, reply) {
                log.debug('Redis exists ::  Key = ' + key + ( reply == 1 ? '' : ' does not ') + ' exists');
                cb(err, reply);
            });
        }
    } catch (e) {
        logErroMessage('REDIS exists :: ' + e, cb, e);
    }
};

module.exports = new redisCache();
