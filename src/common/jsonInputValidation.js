const conf = require('./../config/config');
const log = require('./../log/logger');
const Validator = require('jsonschema').Validator;
const v = new Validator();
const util = require('util');

const CONF = '-conf';

function isValidationRequired(jsonData) {
    if (jsonData != null && jsonData != undefined && (Object.keys(jsonData).length > 0) || util.isArray(jsonData.attr)) {
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
        var errMsg = "input validation failed. Reason :: " + result.errors.join(", ");
        log.error(errMsg);
        throw new Error(errMsg);
    }
    return true;
};

InputValidator.prototype.validate = function (jsonData) {
    if (isValidationRequired(jsonData)) {
        const resource = jsonData.operation ? jsonData.operation : jsonData.table;
        const schema = this.getSchema(resource);
        const schemaConf = this.getConf(resource);
        log.debug('jsonData = ' + JSON.stringify(jsonData) + '\n schema = ' + JSON.stringify(schema) + '\n schemaConf = ' + JSON.stringify(schemaConf));
        const rows = jsonData.attr;
        if (util.isArray(rows) && schemaConf && schemaConf.bulk) {
            if (rows.length > schemaConf.bulk.max) {
                throw new Error('You could bulk maximum of ' + schemaConf.bulk.max + ' records.');
            }
            for (var l = 0; l < rows.length; l++) {
                const obj = {
                    "schema": jsonData.schema,
                    "table": jsonData.table,
                    "attr": rows[l]
                };
                // if one fails all fails
                this.validateWithSchema(obj, schema);
            }
        } else {
            if (util.isArray(rows)) {
                throw new Error('Bulk insert not allow on this resource.');
            }
            this.validateWithSchema(jsonData, schema);
        }
    }
    return true;
};

module.exports = new InputValidator();
