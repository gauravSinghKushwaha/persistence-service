const conf = require('./../config/config');
const log = require('./../log/logger');
var Validator = require('jsonschema').Validator;
var v = new Validator();

module.exports = function (jsonData) {
    log.debug('json-data = ' + jsonData + ' schema = ' + conf.resourceSchema);

    var result = v.validate(jsonData, conf.resourceSchema);
    console.log(result);
    if (result.ok) {
        log.debug('json validation successfull for jsonData = ' + jsonData + ' schema = ' + conf.resourceSchema);
        return true;
    }
    else {
        console.log("JSON has the following errors: " + result.errors.join(", ") + " at path " + result.path);
        log.info("JSON has the following errors: " + result.errors.join(", ") + " at path " + result.path);
    }
    /*
     if (!valid) {
     }
     log.debug('json validation successfull for jsonData = ' + jsonData + ' with errors = ' + jsonValidator.errors + ' schema = ' + conf.resourceSchema);
     return true;
     */
}