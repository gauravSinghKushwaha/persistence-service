const crypt = require('./../../common/encrypt');
const log = require('./../../log/logger');
const conf = require('./../../config/config');
const con = require('./../../db/connection');
const jsonValidator = require('./../../common/jsonInputValidation');
const QueryBuilder = require('./../../db/queryBuilder/queryBuilder');
const express = require('express');
const auth = require('basic-auth');
const router = express.Router();
const config = conf.config;

/**
 * Middleware woudl be used for authentication
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
        console.log(err);
        log.error(err);
        return res.status(400).send(('{"error" : "' + err.toString() + '"}'));
    }
    next();
});

/*CREATE*/
router.route('/resources').post(function (req, res) {
    con.execute(con.WRITE, function (err, connection) {
        if (err) {
            log.error(err);
            return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
        }
        qb = new QueryBuilder(req, jsonValidator.getSchema(req.body.table), jsonValidator.getConf(req.body.table));
        q = qb.createInsertQuery();
        log.debug(q);
        connection.query(q.query, q.values, function (err, results, fields) {
            connection.release();
            if (err) {
                log.error(err);
                return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
            }
            log.debug('results = ' + JSON.stringify(results) + '\t\tfields = ' + JSON.stringify(fields));
            return res.status(201).send(('{"id" : "' + results.insertId + '"}'));
        });
    });
});

/*UPDATE*/
router.route('/resources/:id').put(function (req, res) {
    con.execute(con.WRITE, function (err, connection) {
        if (err) {
            log.error(err);
            return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
        }
        qb = new QueryBuilder(req, jsonValidator.getSchema(req.body.table), jsonValidator.getConf(req.body.table));
        q = qb.updateQuery();
        log.debug(q);
        connection.query(q.query, q.values, function (err, results, fields) {
            connection.release();
            if (err) {
                log.error(err);
                return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
            }
            log.debug('results = ' + JSON.stringify(results) + '\t\tfields = ' + JSON.stringify(fields));
            return res.status(200).send('{"affectedRows" : "' + results.affectedRows + '"}');
        });
    });
});

/*POST SEARCH*/
router.route('/search').post(function (req, res) {
    con.execute(con.READ, function (err, connection) {
        if (err) {
            log.error(err);
            return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
        }
        try {
            qb = new QueryBuilder(req, jsonValidator.getSchema(req.body.operation), jsonValidator.getConf(req.body.table));
            q = qb.searchQuery();
            log.debug(q);
            connection.query(q.query, q.values, function (err, results, fields) {
                connection.release();
                if (err) {
                    log.error(err);
                    return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
                }
                log.debug('results = ' + JSON.stringify(results) + '\t\tfields = ' + JSON.stringify(fields));
                qb.decryptValues(results);
                return res.status(200).send(results);
            });
        } catch (err) {
            log.error(err);
            return res.status(err.id ? err.id : 500).send(('{"error" : "' + err.toString() + '"}'));
        }
    });
});

/**
 * GET
 */
router.route('/resources/:id').get(function (req, res) {
    const table = req.query.table;
    const schema = req.query.schema;
    const id = req.params.id;
    if (table && schema && id && jsonValidator.getSchema(table)) {
        con.execute(con.READ, function (err, connection) {
            if (err) {
                log.error(err);
                return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
            }
            qb = new QueryBuilder(req, jsonValidator.getSchema(table), jsonValidator.getConf(table));
            q = qb.findById(table, schema, id);
            log.debug(q);
            connection.query(q.query, q.values, function (err, results, fields) {
                connection.release();
                if (err) {
                    log.error(err);
                    return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
                }
                log.debug('results = ' + JSON.stringify(results) + '\t\tfields = ' + JSON.stringify(fields));
                qb.decryptValues(results);
                return res.status(200).send(results);
            });
        });
    } else {
        return res.status(400).send('Wrong request, Either table, schema , id is missing.');
    }
});

/**
 * DELETE
 */
router.route('/resources/:id').delete(function (req, res) {
    const table = req.query.table;
    const schema = req.query.schema;
    const id = req.params.id;
    if (table && schema && id && jsonValidator.getSchema(table)) {
        con.execute(con.WRITE, function (err, connection) {
            if (err) {
                log.error(err);
                return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
            }
            qb = new QueryBuilder(req, jsonValidator.getSchema(table), jsonValidator.getConf(table));
            q = qb.deleteById(table, schema, id);
            log.debug(q);
            connection.query(q.query, q.values, function (err, results, fields) {
                connection.release();
                if (err) {
                    log.error(err);
                    return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
                }
                log.debug('results = ' + JSON.stringify(results) + '\t\tfields = ' + JSON.stringify(fields));
                console.log('results = ' + JSON.stringify(results) + '\t\tfields = ' + JSON.stringify(fields));
                return res.status(200).send('{"affectedRows" : "' + results.affectedRows + '"}');
            });
        });
    } else {
        return res.status(400).send('Wrong request, Either table, schema , id is missing.');
    }
});

/*POST SEARCH*/
router.route('/delete').post(function (req, res) {
    con.execute(con.READ, function (err, connection) {
        if (err) {
            log.error(err);
            return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
        }
        try {
            qb = new QueryBuilder(req, jsonValidator.getSchema(req.body.operation), jsonValidator.getConf(req.body.table));
            q = qb.deleteQuery();
            log.debug(q);
            console.log(JSON.stringify(q))
            connection.query(q.query, q.values, function (err, results, fields) {
                connection.release();
                if (err) {
                    log.error(err);
                    return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
                }
                log.debug('results = ' + JSON.stringify(results) + '\t\tfields = ' + JSON.stringify(fields));
                return res.status(200).send(results);
            });
        } catch (err) {
            log.error(err);
            return res.status(err.id ? err.id : 500).send(('{"error" : "' + err.toString() + '"}'));
        }
    });
});

module.exports = router;
