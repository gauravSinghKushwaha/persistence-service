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
    var credentials = auth(req);
    if (!credentials || credentials.name != config.apiauth.user || credentials.pass != config.apiauth.pwd) {
        log.warn('access denied for credentials = ' + credentials.name + ' pwd = ' + credentials.pass);
        res.status(401);
        res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
        return res.send('{success:Access denied}');
    }
    next();
});

router.route('/resources').post(function (req, res) {

    try {
        jsonValidator.validate(req.body);
    } catch (err) {
        res.status(400);
        return res.send(err.toString());
    }

    con.execute(con.WRITE, function (err, connection) {
        if (err) {
            log.error(err);
            res.status(500);
            return res.send('error getting connection =' + err.toString());
        }
        queryBuilder = new QueryBuilder(req, res, jsonValidator.getSchema(req.body));
        query = queryBuilder.createInsertQuery();
        connection.query(query.query, query.values, function (error, results, fields) {
            connection.release();
            if (error) {
                log.error(error);
                res.status(400);
                return res.send(error.toString());
            }
            log.debug('results = ' + results + '\nfields = ' + fields);
            res.status(201);
            return res.send(JSON.stringify(results.insertId));
        });
    });
});

router.route('/password').get(function (req, res) {
    res.status(200).send('{password:password}');
});

module.exports = router;
