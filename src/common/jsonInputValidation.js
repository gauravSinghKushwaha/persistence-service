const conf = require('./../config/config');
const log = require('./../log/logger');
var Validator = require('jsonschema').Validator;
var v = new Validator();

function isValidationRequired(jsonData) {
    if (jsonData != null && jsonData != undefined) {
        return true;
    }
    return false;
}

module.exports =
    {
        validate: function (jsonData) {
            const schema = jsonData.operation ? this.getOperationSchema(jsonData.operation) : this.getResourceSchema(jsonData.table);
            log.debug('jsonData = ' + JSON.stringify(jsonData) + '\n schema = ' + JSON.stringify(schema));
            var result = v.validate(jsonData, schema);
            if (result.errors != null && result.errors.length > 0) {
                var errMsg = "JSON validation failed. Reason :: " + result.errors.join(", ");
                log.error(errMsg);
                throw new Error(errMsg);
            }
            return true;
        }
        ,
        getOperationSchema: function (operation) {
            return conf.resourceSchema.get(operation);
        },
        getResourceSchema: function (resource) {
            return conf.resourceSchema.get(resource);
        }
    }