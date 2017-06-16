const crypt = require('./../../common/encrypt');
const log = require('./../../log/logger');
const conf = require('./../../config/config');
const cluster = require('./../../db/connection');
const cache = require('./../../cache/cache');
const jsonValidator = require('./../../common/jsonInputValidation');
const QueryBuilder = require('./../../db/queryBuilder/queryBuilder');
const express = require('express');
const auth = require('basic-auth');
const router = express.Router();
const config = conf.config;

/**
 * Calling querybuilder to build queries and executing here....
 *
 * IF you update , check https://github.com/mysqljs/mysql for better query building and connection usages
 */

/**
 * Middleware would be used for authentication
 * @param  {[type]}   req  [description]
 * @param  {[type]}   res  [description]
 * @param  {Function} next [description]
 * @return {[type]}        [description]
 */
router.use(function timeLog(req, res, next) {
    /*API consumer's credentials matching*/
    var credentials = auth(req);
    if (!credentials || credentials.name != config.apiauth.user || credentials.pass != config.apiauth.pwd) {
        log.warn('access denied for credentials = ' + credentials.name + ' pwd = ' + credentials.pass);
        res.status(401);
        res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
        return res.send('{"success" : "Access denied"}');
    }

    /*Validating request payload against json schema*/
    try {
        jsonValidator.validate(req.body);
    } catch (err) {
        log.error(err);
        return res.status(400).send(('{"error" : "' + err.toString() + '"}'));
    }
    next();
});

function releaseConnection(connection) {
    if (connection) connection.release();
}

post = function (req, res) {
    cluster.execute(cluster.WRITE, function (err, connection) {
        if (err) {
            log.error(err);
            return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
        }
        try {
            qb = new QueryBuilder(req, jsonValidator.getSchema(req.body.table), jsonValidator.getConf(req.body.table));
            q = qb.insertQuery();
            log.debug(q);
            connection.query(q.query, q.values, function (err, results, fields) {
                releaseConnection(connection);
                if (err) {
                    log.error(err);
                    return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
                }
                log.debug('results = ' + JSON.stringify(results) + '\t\tfields = ' + JSON.stringify(fields));
                return res.status(201).send((results.insertId > 0 ? '{"id" : "' + results.insertId + '"}' : '{"rows" : "' + results.affectedRows + '"}'));
            });
        } catch (err) {
            releaseConnection(connection);
            log.error(err);
            return res.status(err.id ? err.id : 500).send(('{"error" : "' + err.toString() + '"}'));
        }
    });
};

put = function (req, res) {
    const id = req.params.id;
    if (id) {
        cluster.execute(cluster.WRITE, function (err, connection) {
            if (err) {
                log.error(err);
                return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
            }
            try {
                qb = new QueryBuilder(req, jsonValidator.getSchema(req.body.table), jsonValidator.getConf(req.body.table));
                q = qb.updateQuery();
                log.debug(q);
                connection.query(q.query, q.values, function (err, results, fields) {
                    releaseConnection(connection);
                    if (err) {
                        log.error(err);
                        return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
                    }
                    log.debug('results = ' + JSON.stringify(results) + '\t\tfields = ' + JSON.stringify(fields));
                    return res.status(200).send('{"affectedRows" : "' + results.changedRows + '"}');
                });
            } catch (err) {
                releaseConnection(connection);
                log.error(err);
                return res.status(err.id ? err.id : 500).send(('{"error" : "' + err.toString() + '"}'));
            }
        });
    }
    else {
        return res.status(400).send('id is missing.');
    }
};


postSearch = function (req, res) {
    cluster.execute(cluster.READ, function (err, connection) {
        if (err) {
            log.error(err);
            return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
        }
        try {
            qb = new QueryBuilder(req, jsonValidator.getSchema(req.body.operation), jsonValidator.getConf(req.body.table));
            q = qb.searchQuery();
            log.debug(q);
            connection.query(q.query, q.values, function (err, results, fields) {
                releaseConnection(connection);
                if (err) {
                    log.error(err);
                    return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
                }
                log.debug('results = ' + JSON.stringify(results) + '\t\tfields = ' + JSON.stringify(fields));
                qb.decryptValues(results);
                return res.status(200).send(results);
            });
        } catch (err) {
            releaseConnection(connection);
            log.error(err);
            return res.status(err.id ? err.id : 500).send(('{"error" : "' + err.toString() + '"}'));
        }
    });
};

get = function (req, res) {
    const table = req.query.table;
    const schema = req.query.schema;
    const id = req.params.id;
    if (table && schema && id && jsonValidator.getSchema(table)) {
        cluster.execute(cluster.READ, function (err, connection) {
            if (err) {
                log.error(err);
                return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
            }
            try {
                qb = new QueryBuilder(req, jsonValidator.getSchema(table), jsonValidator.getConf(table));
                q = qb.findById(table, schema, id);
                log.debug(q);
                connection.query(q.query, q.values, function (err, results, fields) {
                    releaseConnection(connection);
                    if (err) {
                        log.error(err);
                        return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
                    }
                    log.debug('results = ' + JSON.stringify(results) + '\t\tfields = ' + JSON.stringify(fields));
                    qb.decryptValues(results);
                    return res.status(200).send(results);
                });
            } catch (err) {
                releaseConnection(connection);
                log.error(err);
                return res.status(err.id ? err.id : 500).send(('{"error" : "' + err.toString() + '"}'));
            }
        });
    } else {
        return res.status(400).send('Wrong request, Either table, schema , id is missing.');
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
                return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
            }
            try {
                qb = new QueryBuilder(req, jsonValidator.getSchema(table), jsonValidator.getConf(table));
                q = qb.deleteById(table, schema, id);
                log.debug(q);
                connection.query(q.query, q.values, function (err, results, fields) {
                    releaseConnection(connection);
                    if (err) {
                        log.error(err);
                        return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
                    }
                    log.debug('results = ' + JSON.stringify(results) + '\t\tfields = ' + JSON.stringify(fields));
                    return res.status(200).send('{"deleted" : "' + results.affectedRows + '"}');
                });
            } catch (err) {
                releaseConnection(connection);
                log.error(err);
                return res.status(err.id ? err.id : 500).send(('{"error" : "' + err.toString() + '"}'));
            }
        });
    } else {
        return res.status(400).send('Wrong request, Either table, schema , id is missing.');
    }
};

postDel = function (req, res) {
    cluster.execute(cluster.WRITE, function (err, connection) {
        if (err) {
            log.error(err);
            return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
        }
        try {
            qb = new QueryBuilder(req, jsonValidator.getSchema(req.body.operation), jsonValidator.getConf(req.body.table));
            q = qb.deleteQuery();
            log.debug(q);
            connection.query(q.query, q.values, function (err, results, fields) {
                releaseConnection(connection);
                if (err) {
                    log.error(err);
                    return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
                }
                log.debug('results = ' + JSON.stringify(results) + '\t\tfields = ' + JSON.stringify(fields));
                return res.status(200).send('{"deleted" : "' + results.affectedRows + '"}');
            });
        } catch (err) {
            releaseConnection(connection);
            log.error(err);
            return res.status(err.id ? err.id : 500).send(('{"error" : "' + err.toString() + '"}'));
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
                return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
            }
            try {
                qb = new QueryBuilder(req, jsonValidator.getSchema(table), jsonValidator.getConf(table));
                q = qb.getanddelete(table, schema, id);
                log.debug(q);
                connection.query(q.query, q.values, function (err, results, fields) {
                    releaseConnection(connection);
                    if (err) {
                        log.error(err);
                        return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
                    }
                    log.debug('results = ' + JSON.stringify(results) + '\t\tfields = ' + JSON.stringify(fields));
                    qb.decryptValues(results[0]);
                    return res.status(200).send(results[0]);
                });
            } catch (err) {
                releaseConnection(connection);
                log.error(err);
                return res.status(err.id ? err.id : 500).send(('{"error" : "' + err.toString() + '"}'));
            }
        });
    } else {
        return res.status(400).send('Wrong request, Either table, schema , id is missing.');
    }
};

putIfPresent = function (req, res) {
    const id = req.params.id;
    if (id) {
        cluster.execute(cluster.WRITE, function (err, connection) {
            if (err) {
                log.error(err);
                return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
            }
            try {
                qb = new QueryBuilder(req, jsonValidator.getSchema(req.body.table), jsonValidator.getConf(req.body.table));
                q = qb.updateQuery();
                log.debug(q);
                connection.query(q.query, q.values, function (err, results, fields) {
                    if (err) {
                        log.error(err);
                        return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
                    }
                    log.debug('update results = ' + JSON.stringify(results) + '\t\tfields = ' + JSON.stringify(fields));
                    if (results.changedRows <= 0) {
                        q = qb.insertQuery();
                        log.debug(q);
                        connection.query(q.query, q.values, function (err, results, fields) {
                            releaseConnection(connection);
                            if (err) {
                                log.error(err);
                                return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
                            }
                            log.debug('results = ' + JSON.stringify(results) + '\t\tfields = ' + JSON.stringify(fields));
                            return res.status(201).send((results.insertId > 0 ? '{"id" : "' + results.insertId + '"}' : '{"affectedRows" : "' + results.affectedRows + '"}'));
                        });
                    } else {
                        return res.status(201).send('{"affectedRows" : "' + results.affectedRows + '"}');
                    }
                });
            } catch (err) {
                releaseConnection(connection);
                log.error(err);
                return res.status(err.id ? err.id : 500).send(('{"error" : "' + err.toString() + '"}'));
            }
        });
    }
    else {
        return res.status(400).send('id is missing.');
    }
};

/*CREATE*/
router.route('/resources').post(function (req, res) {
    post(req, res);
});


/*CREATE*/
router.route('/resources/:id').post(function (req, res) {
    post(req, res);
});

/*UPDATE*/
router.route('/resources/:id').put(function (req, res) {
    put(req, res);
});

/*POST SEARCH*/
router.route('/search').post(function (req, res) {
    postSearch(req, res);
});

/**
 * GET
 */
router.route('/resources/:id').get(function (req, res) {
    get(req, res);
});

/**
 * DELETE
 */
router.route('/resources/:id').delete(function (req, res) {
    del(req, res);
});

/*POST CONDITIONAL DELETE*/
router.route('/delete').post(function (req, res) {
    postDel(req, res);
});

/**
 * GET AND Delete the same
 */
router.route('/getanddelete/resources/:id').get(function (req, res) {
    getAndDelete(req, res);
});

/**
 * PUT if present else POST
 */
/*UPDATE*/

router.route('/putifpresent/resources/:id').post(function (req, res) {
    putIfPresent(req, res);
});


module.exports = router;
