const path = require('path');
const fs = require('fs');

const UTF_8 = "utf8"
const RES = '/resources';
var configFile = process.argv[2];
console.log(' configFile arg = ' + configFile);

if (configFile != null && !path.isAbsolute(configFile)) {
  configFile = path.resolve(__dirname + RES, configFile);
} else {
  throw (new Error('could not readd properties file ' + configFile));
}
console.log(' reading config from = ' + configFile);

module.exports = JSON.parse(fs.readFileSync(configFile, UTF_8));
