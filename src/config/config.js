const path = require('path');
const fs = require('fs');

const UTF_8 = "utf8"
const RES = '/resources';

function readConfig(configFile) {
  console.log(' configFile arg = ' + configFile);
  if (configFile != null && !path.isAbsolute(configFile)) {
    configFile = path.resolve(__dirname + RES, configFile);
  } else {
    throw (new Error('could not readd properties file ' + configFile));
  }
  console.log(' reading config from = ' + configFile);
  return JSON.parse(fs.readFileSync(configFile, UTF_8));
}

module.exports = {
  config: readConfig(process.argv[2]),
  dbconfig: readConfig(process.argv[3])
};
