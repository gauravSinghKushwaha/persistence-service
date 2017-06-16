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

module.exports = new redisCache();
