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
        queryBuilder = new QueryBuilder(req, jsonValidator.getResourceSchema(req.body.table));
        query = queryBuilder.createInsertQuery();
        connection.query(query.query, query.values, function (err, results, fields) {
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
        queryBuilder = new QueryBuilder(req, jsonValidator.getResourceSchema(req.body.table));
        query = queryBuilder.updateQuery();
        connection.query(query.query, query.values, function (err, results, fields) {
            connection.release();
            if (err) {
                log.error(err);
                return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
            }
            log.debug('results = ' + JSON.stringify(results) + '\t\tfields = ' + JSON.stringify(fields));
            return res.status(200).send('{"rows" : "' + results.affectedRows + '"}');
        });
    });
});

/*GET*/
router.route('/search').post(function (req, res) {
    con.execute(con.READ, function (err, connection) {
        if (err) {
            log.error(err);
            return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
        }
        queryBuilder = new QueryBuilder(req, jsonValidator.getResourceSchema(req.body.table), jsonValidator.getOperationSchema(req.body.operation));
        query = queryBuilder.findByIDQuery();
        console.log(query);
        connection.query(query.query, query.values, function (err, results, fields) {
            connection.release();
            if (err) {
                log.error(err);
                return res.status(500).send(('{"error" : "' + err.toString() + '"}'));
            }
            console.log(results);
            console.log('results = ' + results + '\t\tfields = ' + fields);
            results.forEach(function (obj) {
                Object.keys(obj).forEach(function (k) {
                    obj[k] = queryBuilder.decryptValues(k, obj[k]);
                });
            });
            res.status(200);
            return res.status(200).send(results);
        });
    });
});

module.exports = router;
