const log = require('./../../log/logger');
const conf = require('./../../config/config');
const cluster = require('./../../db/connection');
const cache = require('./../../cache/cache');
const jsonValidator = require('./../../common/jsonInputValidation');
const QueryBuilder = require('./../../db/queryBuilder/queryBuilder');
const express = require('express');
const util = require('util');
const auth = require('basic-auth');

/**
 * Calling querybuilder to build queries and executing here....
 *
 * IF you update , check https://github.com/mysqljs/mysql for better query building and connection usages
 */

const router = express.Router();
const config = conf.config;
const AT = '@';
const COLON = ':';
const SPACE = ' ';

function releaseConnection(connection) {
    if (connection) connection.release();
}

/**
 * Middleware would be used for authentication
 * @param  {[type]}   req  [description]
 * @param  {[type]}   res  [description]
 * @param  {Function} next [description]
 * @return {[type]}        [description]
 */
router.use(function timeLog(req, res, next) {
    /*API consumer's credentials matching*/
    res.setHeader('Content-Type', 'application/json');
    var credentials = auth(req);
    if (!credentials || credentials.name != config.apiauth.user || credentials.pass != config.apiauth.pwd) {
        log.warn('basic auth failed, access denied for api . credentials = ' + credentials);
        res.status(401);
        res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
        return res.send({error: 'Access denied'});
    }

    /*Validating request payload against json schema*/
    function validateInputValueAgainstSchema(schema, colValArray) {
        const keys = Object.keys(colValArray);
        for (i = 0; i < keys.length; i++) {
            const k = keys[i].toString();
            const obj = colValArray[k];
            const miniSchema = schema.properties.attr.properties[k];
            // e.g. post search where username in (.._
            if (util.isArray(obj)) {
                if (obj.length > 1024) {
                    throw new Error('In clause can have maximum of 1024.');
                }
                for (j = 0; j < obj.length; j++) {
                    jsonValidator.validateWithSchema(obj[j], miniSchema);
                }
            } else {
                jsonValidator.validateWithSchema(obj, miniSchema);
            }
        }
    }

    try {
        /* validating req.method against allowed HTTP verb on resource*/
        const table = req.body.table ? req.body.table : req.query.table;
        const conf = jsonValidator.getConf(table);
        if (conf && conf.operation && conf.operation.indexOf(req.method) == -1) {
            throw new Error('Operation ' + req.method + ' not allowed on resource ' + table);
        }

        /* validating input body against allowed schema, for POST operation against {{res-name}}.json,
         for PUT against update.json, for DELETE against delete.json , for POST Search against search.json */
        jsonValidator.validate(req.body);

        /* FOR PUT/Update,we need to validate data against {{res-name}}.json as well */
        const schema = jsonValidator.getSchema(req.body.table);
        if (schema && req.body && req.body.operation == 'update') {
            validateInputValueAgainstSchema(schema, req.body.attr);
        } else if (schema && req.body && ( req.body.operation == 'delete' || req.body.operation == 'search')) {
            validateInputValueAgainstSchema(schema, req.body.where);
        }
    } catch (err) {
        log.error(err);
        return res.status(400).send({error: err.toString()});
    }
    next();
});

function createKey(table, pkValue, conf) {
    const cacheKey = ((config.cache && config.cache.prefix && config.cache.version ) ? (config.cache.prefix + COLON + config.cache.version + AT) : '')
        + (conf.cached.prefix ? conf.cached.prefix : table) + COLON + (conf.cached.version ? conf.cached.version : 1) + AT + pkValue;
    return cacheKey;
}

function addSingleValueToCache(key, value, conf, cb) {
    cache.add(key, value, conf.cached.expiry, function (err, result) {
        cb(err, result);
    });
}

function addMultiValueKeysToCacheList(key, value, conf, cb) {
    cache.addToList(key, value, function (err, result) {
        if (err) {
            cb(err);
            return;
        } else {
            cache.setExpiry(key, conf.cached.expiry, function (err) {
                if (err) {
                    log.error('error setting expiry for ' + key + ' expiry = ' + conf.cached.expiry);
                    cb(err);
                    return;
                }
            });
        }
        cb(err, result);
    });
}

function logCacheNotEnabled(cb) {
    log.debug('{"info": "Cache no enabled for this resource."}');
    cb();
}

function isResourceKeyReturnMultipleRows(conf) {
    return conf.multiValueKey;
}

function addToCache(key, value, conf, cb) {
    if (isResourceKeyReturnMultipleRows(conf)) {
        addMultiValueKeysToCacheList(key, value, conf, cb);
    } else {
        addSingleValueToCache(key, value, conf, cb);
    }
}

/**
 * add create/POST to cache
 * @param key
 * @param value
 */
function addToRedisCache(key, value, conf, cb) {
    if (isCached(conf)) {
        addToCache(key, value, conf, cb);
    } else {
        logCacheNotEnabled(cb);
    }
}

/**
 * returns object for key
 * @param key
 */
function getCachedValue(key, conf, cb) {
    if (isCached(conf)) {
        if (isResourceKeyReturnMultipleRows(conf)) {
            cache.getListMembers(key, function (err, result) {
                cb(err, result);
            });
        } else {
            cache.get(key, function (err, result) {
                cb(err, result);
            });
        }
    } else {
        logCacheNotEnabled(cb);
    }
}

/**
 * removes from cache
 * @param key
 * @param conf
 * @param cb
 */
function removeFromCache(key, conf, cb) {
    if (isCached(conf)) {
        cache.del(key, function (err, response) {
            if (response) {
                cb(undefined, response);
            } else {
                cb(err);
            }
        })
    } else {
        log.debug('{"info": "Cache no enabled for this resource."}');
        cb();
    }
}

function isCached(conf) {
    return conf && conf.cached && conf.cached.allowed && conf.cached.allowed == true;
}

function getResIdToObject(dbInsertId, conf, resourceKey, requestParameterId) {
// auto-generated
    if (dbInsertId && dbInsertId > 0 && conf.auto.indexOf(resourceKey) > -1) {
        return dbInsertId;
    } else if (requestParameterId && Object.keys(requestParameterId).length > 0) { // in URL
        return requestParameterId;
    }
    return undefined;
}

function hashEncryptAttributes(value, conf, qb) {
    const keys = Object.keys(value);
    for (var i = 0; i < keys.length; i++) {
        const k = keys[i].toString();
        value[k] = qb.getEncryptedValue(conf, k, value[k], false);
    }
}

function addAttributeToObject(obj, attributeKey, attributeValue) {
    if (attributeValue) {
        obj[attributeKey] = attributeValue;
    }
}

function logError(err) {
    if (err) {
        log.error('ERROR : cache add = ' + err);
    }
}

function logErrorWithCallBack(err, cb) {
    log.error('ERROR : cache add = ' + err);
    cb(err);
}

function addToCacheAgainstKey(tableName, restObject, resourceConf, cb) {
    const resourceKey = resourceConf.key.toString();
    if (util.isArray(restObject)) {
        restObject.forEach(function (cacheCandidate) {
            const cacheKey = createKey(tableName, cacheCandidate[resourceKey], resourceConf);
            addToRedisCache(cacheKey, cacheCandidate, resourceConf, function (err, res) {
                logError(err);
            });
        });
        cb(undefined);
    } else {
        const cacheKey = createKey(tableName, restObject[resourceKey], resourceConf);
        addToRedisCache(cacheKey, restObject, resourceConf, function (err, res) {
            if (err) {
                logErrorWithCallBack(err, cb);
            } else {
                cb(err, res);
            }
        });
    }
}

function hashEncryptEnrichObject(restObject, resourceConf, results, requestParameterId, qb) {
    const resourceKey = resourceConf.key.toString();
    const resId = getResIdToObject(results, resourceConf, resourceKey, requestParameterId);
    addAttributeToObject(restObject, resourceKey, resId);
    hashEncryptAttributes(restObject, resourceConf, qb);
}

function hashEncryptEnrichObjectList(resourcesInReqBody, resourceConf, results, requestParameterId, qb) {
    for (var i = 0; i < resourcesInReqBody.length; i++) {
        hashEncryptEnrichObject(resourcesInReqBody[i], resourceConf, results, requestParameterId, qb);
    }
}

function encryptHashAndAddToCache(resourceConf, req, results, qb, cb) {
    const resourcesInReqBody = req.body.attr;
    const table = req.body.table;
    const requestParameterId = req.params.id;
    const isResourceCached = isCached(resourceConf);
    const isResAnArrayOfResObjects = util.isArray(resourcesInReqBody);
    try {
        if (isResourceCached) {
            if (isResAnArrayOfResObjects) {
                hashEncryptEnrichObjectList(resourcesInReqBody, resourceConf, results, requestParameterId, qb);
            } else {
                hashEncryptEnrichObject(resourcesInReqBody, resourceConf, results, requestParameterId, qb);
            }
            addToCacheAgainstKey(table, resourcesInReqBody, resourceConf, cb);
        }
    } catch (e) {
        cb(e);
    }
}

post = function (req, res) {
    cluster.execute(cluster.WRITE, function (err, connection) {
        if (err) {
            log.error(err);
            return res.status(500).send({error: err.toString()});
        }
        try {
            const conf = jsonValidator.getConf(req.body.table);
            const qb = new QueryBuilder(req, jsonValidator.getSchema(req.body.table), conf);
            q = qb.insertQuery();
            log.debug(q);
            connection.query(q.query, q.values, function (err, results, fields) {
                releaseConnection(connection);
                if (err) {
                    log.error(err);
                    return res.status(500).send({error: err.toString()});
                }
                /*add to cache*/
                encryptHashAndAddToCache(conf, req, results, qb, function (err) {
                    if (err) {
                        log.error('error setting to cache ' + err);
                    }
                });
                /*add to cache end*/
                return res.status(201).send({
                    insertId: results.insertId,
                    changedRows: results.changedRows,
                    affectedRows: results.affectedRows
                });
            });
        } catch (err) {
            releaseConnection(connection);
            log.error(err);
            return res.status(err.id ? err.id : 500).send({error: err.toString()});
        }
    });
};

put = function (req, res) {
    const id = req.params.id;
    if (id) {
        cluster.execute(cluster.WRITE, function (err, connection) {
            if (err) {
                log.error(err);
                return res.status(500).send({error: err.toString()});
            }
            try {
                const table = req.body.table;
                const schema = jsonValidator.getSchema(table);
                const conf = jsonValidator.getConf(table);
                qb = new QueryBuilder(req, schema, conf);
                q = qb.updateQuery();
                log.debug(JSON.stringify(q));
                connection.query(q.query, q.values, function (err, results, fields) {
                    releaseConnection(connection);
                    if (err) {
                        log.error(err);
                        return res.status(500).send({error: err.toString()});
                    }
                    /*remove from cache*/
                    removeFromCache(createKey(table, id, conf), conf, function (err, res) {
                        if (res && res == 1) {
                            log.debug('Cache Removed successfully')
                        } else {
                            log.error('ERROR :: Cache Remove' + err);
                        }
                    });
                    /*removed from cache*/
                    return res.status(200).send({affectedRows: results.affectedRows, changedRows: results.changedRows});
                });
            } catch (err) {
                releaseConnection(connection);
                log.error(err);
                return res.status(err.id ? err.id : 500).send({error: err.toString()});
            }
        });
    }
    else {
        return res.status(400).send({error: 'id is missing.'});
    }
};

postSearch = function (req, res) {
    cluster.execute(cluster.READ, function (err, connection) {
        if (err) {
            log.error(err);
            return res.status(500).send({error: err.toString()});
        }
        try {
            qb = new QueryBuilder(req, jsonValidator.getSchema(req.body.operation), jsonValidator.getConf(req.body.table));
            q = qb.searchQuery();
            log.debug(q);
            connection.query(q.query, q.values, function (err, results, fields) {
                releaseConnection(connection);
                if (err) {
                    log.error(err);
                    return res.status(500).send({error: err.toString()});
                }
                qb.decryptValues(results);
                return res.status(200).send(results);
            });
        } catch (err) {
            releaseConnection(connection);
            log.error(err);
            return res.status(err.id ? err.id : 500).send({error: err.toString()});
        }
    });
};

get = function (req, res) {
    const table = req.query.table;
    const schema = req.query.schema;
    const id = req.params.id;
    const resSchema = jsonValidator.getSchema(table);
    const conf = jsonValidator.getConf(table);
    if (table && schema && id && resSchema) {
        const qb = new QueryBuilder(req, resSchema, conf);
        getCachedValue(createKey(table, id, conf), conf, function (err, result) {
            if (result) {
                qb.decryptValues(result);
                return res.status(200).send(result);
            } else {
                if (err) {
                    log.error('error from cache = ' + err);
                }
                cluster.execute(cluster.READ, function (err, connection) {
                    if (err) {
                        log.error('error from db read = ' + err);
                        return res.status(500).send({error: err.toString()});
                    }
                    try {
                        const q = qb.findById(table, schema, id);
                        log.debug('query obj = ' + q);
                        connection.query(q.query, q.values, function (err, results, fields) {
                            releaseConnection(connection);
                            if (err) {
                                log.error(err);
                                return res.status(500).send({error: err.toString()});
                            }
                            log.debug('results = ' + results.length);
                            /*add to cache*/
                            const resultsClone = JSON.parse(JSON.stringify(results));
                            addToCacheAgainstKey(table, results, conf, function (err, data) {
                                logError(err);
                            });
                            /*added to cache*/
                            qb.decryptValues(resultsClone);
                            return res.status(200).send(resultsClone);
                        });
                    } catch (err) {
                        releaseConnection(connection);
                        log.error(err);
                        return res.status(err.id ? err.id : 500).send({error: err.toString()});
                    }
                });
            }
        });
    } else {
        return res.status(400).send({error: 'Wrong request, Either table, schema or id is missing.'});
    }
};


del = function (req, res) {
    const table = req.query.table;
    const schema = req.query.schema;
    const id = req.params.id;
    if (table && schema && id && jsonValidator.getSchema(table)) {
        cluster.execute(cluster.WRITE, function (err, connection) {
            if (err) {
                log.error(err);
                return res.status(500).send({error: err.toString()});
            }
            try {
                const conf = jsonValidator.getConf(table);
                qb = new QueryBuilder(req, jsonValidator.getSchema(table), conf);
                q = qb.deleteById(table, schema, id);
                log.debug(q);
                connection.query(q.query, q.values, function (err, results, fields) {
                    releaseConnection(connection);
                    if (err) {
                        log.error(err);
                        return res.status(500).send({error: err.toString()});
                    }
                    /*remove from cache*/
                    removeFromCache(createKey(table, id, conf), conf, function (err, res) {
                        if (res && res == 1) {
                            log.debug('deleted successfully')
                        } else {
                            log.error('ERROR :: Cache Remove' + err);
                        }
                    });
                    /*removed from cache*/
                    return res.status(200).send({affectedRows: results.affectedRows});
                });
            } catch (err) {
                releaseConnection(connection);
                log.error(err);
                return res.status(err.id ? err.id : 500).send({error: err.toString()});
            }
        });
    } else {
        return res.status(400).send('{"error" : "' + 'Wrong request, Either table, schema , id is missing."}');
    }
};

postDel = function (req, res) {
    cluster.execute(cluster.WRITE, function (err, connection) {
        if (err) {
            log.error(err);
            return res.status(500).send({error: err.toString()});
        }
        try {
            const table = req.body.table;
            const conf = jsonValidator.getConf(table);
            qb = new QueryBuilder(req, jsonValidator.getSchema(req.body.operation), conf);
            q = qb.deleteQuery();
            log.debug(q);
            connection.query(q.query, q.values, function (err, results, fields) {
                releaseConnection(connection);
                if (err) {
                    log.error(err);
                    return res.status(500).send({error: err.toString()});
                }

                /*removing from cache*/
                const delIds = results[0];
                if (results && delIds && delIds.length > 0) {
                    var ids = Array.from(new Set(delIds.map(function (item) {
                        return createKey(table, item[conf.key], conf);
                    }))).join(SPACE).trim();
                    removeFromCache(ids.trim(), conf, function (err, res) {
                        if (res && res == 1) {
                            log.debug('Cache Removed successfully. ids = ' + ids)
                        } else {
                            log.error('ERROR :: Cache Remove' + err);
                        }
                    });
                }
                /*removed from cache*/

                return res.status(200).send({affectedRows: results[1].affectedRows});
            });
        } catch (err) {
            releaseConnection(connection);
            log.error(err);
            return res.status(err.id ? err.id : 500).send({error: err.toString()});
        }
    });
};

getAndDelete = function (req, res) {
    const table = req.query.table;
    const schema = req.query.schema;
    const id = req.params.id;
    if (table && schema && id && jsonValidator.getSchema(table)) {
        cluster.execute(cluster.WRITE, function (err, connection) {
            if (err) {
                log.error(err);
                return res.status(500).send({error: err.toString()});
            }
            try {
                const conf = jsonValidator.getConf(table);
                qb = new QueryBuilder(req, jsonValidator.getSchema(table), conf);
                q = qb.getanddelete(table, schema, id);
                log.debug(q);
                connection.query(q.query, q.values, function (err, results, fields) {
                    releaseConnection(connection);
                    if (err) {
                        log.error(err);
                        return res.status(500).send({error: err.toString()});
                    }
                    qb.decryptValues(results[0]);
                    /*removing from cache*/
                    const delIds = results[0];
                    if (results && delIds && delIds.length > 0) {
                        var ids = Array.from(new Set(delIds.map(function (item) {
                            return createKey(table, item[conf.key], conf);
                        }))).join(SPACE).trim();
                        removeFromCache(ids.trim(), conf, function (err, res) {
                            if (res && res == 1) {
                                log.debug('Cache Removed successfully. ids = ' + ids);
                            } else {
                                log.error('ERROR :: Cache Remove' + err);
                            }
                        });
                    }
                    /*removed from cache*/
                    return res.status(200).send(results[0]);
                });
            } catch (err) {
                releaseConnection(connection);
                log.error(err);
                return res.status(err.id ? err.id : 500).send({error: err.toString()});
            }
        });
    } else {
        return res.status(400).send({error: 'Wrong request, Either table, schema , id is missing.'});
    }
};

putIfPresent = function (req, res) {
    const id = req.params.id;
    if (id) {
        cluster.execute(cluster.WRITE, function (err, connection) {
            if (err) {
                log.error(err);
                return res.status(500).send({error: err.toString()});
            }
            try {
                const table = req.body.table;
                const conf = jsonValidator.getConf(table);
                const qb = new QueryBuilder(req, jsonValidator.getSchema(table), conf);
                q = qb.updateQuery();
                log.debug(q);
                connection.query(q.query, q.values, function (err, results, fields) { //update
                    if (err) {
                        log.error(err);
                        return res.status(500).send({error: err.toString()});
                    }
                    if (results.changedRows <= 0 && results.affectedRows <= 0) {
                        q = qb.insertQuery();
                        log.debug(q);
                        connection.query(q.query, q.values, function (err, results, fields) { // insert
                            releaseConnection(connection);
                            if (err) {
                                log.error(err);
                                return res.status(500).send({error: err.toString()});
                            }
                            /*add to cache*/
                            encryptHashAndAddToCache(conf, req, results, qb, function (err) {
                                if (err) {
                                    log.error('error setting to cache ' + err);
                                }
                            });
                            /*add to cache end*/
                            return res.status(201).send({
                                insertId: results.insertId,
                                changedRows: results.changedRows,
                                affectedRows: results.affectedRows
                            });
                        });
                    } else {
                        /*remove from cache*/
                        removeFromCache(createKey(table, id, conf), conf, function (err, res) {
                            if (res && res == 1) {
                                log.debug('Cache Removed successfully');
                            } else {
                                log.error('ERROR :: Cache Remove' + err);
                            }
                        });
                        /*removed from cache*/
                        return res.status(201).send({
                            affectedRows: results.affectedRows,
                            changedRows: results.changedRows
                        });
                    }
                });
            } catch (err) {
                releaseConnection(connection);
                log.error(err);
                return res.status(err.id ? err.id : 500).send({error: err.toString()});
            }
        });
    }
    else {
        return res.status(400).send({error: 'id is missing.'});
    }
};

/*CREATE*/
router.route('/resources').post(function (req, res) {
    try {
        post(req, res);
    } catch (err) {
        log.error(err);
        return res.status(err.id ? err.id : 500).send({error: err.toString()});
    }
});


/*CREATE*/
router.route('/resources/:id').post(function (req, res) {
    try {
        post(req, res);
    } catch (err) {
        log.error(err);
        return res.status(err.id ? err.id : 500).send({error: err.toString()});
    }
});

/*UPDATE*/
router.route('/resources/:id').put(function (req, res) {
    try {
        put(req, res);
    } catch (err) {
        log.error(err);
        return res.status(err.id ? err.id : 500).send({error: err.toString()});
    }
});

/**
 * GET
 */
router.route('/resources/:id').get(function (req, res) {
    try {
        get(req, res);
    } catch (err) {
        log.error(err);
        return res.status(err.id ? err.id : 500).send(('{"error" : "' + err.toString() + '"}'));
    }
});

/**
 * DELETE
 */
router.route('/resources/:id').delete(function (req, res) {
    try {
        del(req, res);
    } catch (err) {
        log.error(err);
        return res.status(err.id ? err.id : 500).send({error: err.toString()});
    }
});

/**
 * POST SEARCH
 *
 * NOT CACHED FOR ANY RESOURCE...USE IT JUDICIOUSLY
 *
 * */
router.route('/search').post(function (req, res) {
    try {
        postSearch(req, res);
    } catch (err) {
        log.error(err);
        return res.status(err.id ? err.id : 500).send({error: err.toString()});
    }
});


/* CONDITIONAL DELETE*/
router.route('/delete').delete(function (req, res) {
    try {
        postDel(req, res);
    } catch (err) {
        log.error(err);
        return res.status(err.id ? err.id : 500).send({error: err.toString()});
    }
});

/**
 * get and DELETE the same
 */
router.route('/getanddelete/resources/:id').delete(function (req, res) {
    try {
        getAndDelete(req, res);
    } catch (err) {
        log.error(err);
        return res.status(err.id ? err.id : 500).send({error: err.toString()});
    }
});

/**
 * PUT if present else create
 */
/*UPDATE*/

router.route('/putifpresent/resources/:id').put(function (req, res) {
    try {
        putIfPresent(req, res);
    } catch (err) {
        log.error(err);
        return res.status(err.id ? err.id : 500).send(('{"error" : "' + err.toString() + '"}'));
    }
});


module.exports = router;
