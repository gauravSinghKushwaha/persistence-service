const conf = require('./../config/config');
const log = require('./../log/logger');
var Validator = require('jsonschema').Validator;
var v = new Validator();

module.exports = function (jsonData) {
    const schema = conf.resourceSchema.get(jsonData.table);
    log.debug('jsonData = ' + JSON.stringify(jsonData) + '\n schema = ' + JSON.stringify(schema));
    var result = v.validate(jsonData, schema);
    if (result.errors != null && result.errors.length > 0) {
        console.log(result);
        result.errors.forEach(function (validationError) {

        });
        var errMsg = "JSON validation failed. Reason :: " + result.errors.join(", ");
        log.error(errMsg);
        throw new Error(errMsg);
    }
    return schema;
}