const fileReader = require('./../common/filereader');
const DEF_RES_PATH = './../config/resources';
const DEF_PROP_PATH = './../config/properties';
const DEF_PROP = 'dev.properties';
const DEF_DB_PROP = 'db.properties';

module.exports = {
    config: fileReader.readFile(process.argv[2] == null ? DEF_PROP : process.argv[2], DEF_PROP_PATH),
    dbconfig: fileReader.readFile(process.argv[3] == null ? DEF_DB_PROP : process.argv[3], DEF_PROP_PATH),
    resourceSchema: fileReader.readDir(process.argv[4], DEF_RES_PATH)
}

