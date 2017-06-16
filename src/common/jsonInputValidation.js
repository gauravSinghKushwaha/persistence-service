const conf = require('./../config/config');
const log = require('./../log/logger');
var Validator = require('jsonschema').Validator;
var v = new Validator();
const CONF = '-conf';

function isValidationRequired(jsonData) {
    if (jsonData != null && jsonData != undefined && Object.keys(jsonData).length > 0) {
        return true;
    }
    return false;
}

function InputValidator() {
}
InputValidator.prototype.getSchema = function (resource) {
    return conf.resourceSchema.get(resource);
};

InputValidator.prototype.getConf = function (resource) {
    return conf.resourceSchema.get(resource + CONF);
};

InputValidator.prototype.validateWithSchema = function (jsonData, schema) {
    const result = v.validate(jsonData, schema);
    if (result.errors != null && result.errors.length > 0) {
        var errMsg = "JSON validation failed. Reason :: " + result.errors.join(", ");
        log.error(errMsg);
        throw new Error(errMsg);
    }
    return true;
};

InputValidator.prototype.validate = function (jsonData) {
    if (isValidationRequired(jsonData)) {
        const schema = this.getSchema(jsonData.operation ? jsonData.operation : jsonData.table);
        log.debug('jsonData = ' + JSON.stringify(jsonData) + '\n schema = ' + JSON.stringify(schema));
        this.validateWithSchema(jsonData, schema);
    }
    return true;
};

module.exports = new InputValidator();
