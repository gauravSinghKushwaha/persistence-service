const conf = require('./../config/config');
const log = require('./../log/logger');
var Validator = require('jsonschema').Validator;
var v = new Validator();

module.exports =
    {
        validate: function (jsonData) {
            const schema = this.getSchema(jsonData);
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
        getSchema: function (jsonData) {
            return conf.resourceSchema.get(jsonData.table);
        }
    }