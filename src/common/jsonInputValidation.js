const conf = require('./../config/config');
const log = require('./../log/logger');
var Validator = require('jsonschema').Validator;
var v = new Validator();

module.exports = function (jsonData) {
    try {
        const schema = conf.resourceSchema.get(jsonData.table);
        log.debug('jsonData = ' + JSON.stringify(jsonData) + '\n schema = ' + JSON.stringify(schema));
        var result = v.validate(jsonData, schema);
        if (result.errors != null && result.errors.length > 0) {
            log.error("JSON validation failed for errors: " + result.errors.join(", "));
            throw new Error('Json validation failed. JSON SCHEMA = ' + JSON.stringify(schema));
        }
    } catch (err) {
        log.error("JSON validation failed for errors: " + err);
        throw new Error('Json validation failed');
    }
    return true;
}