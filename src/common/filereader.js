const path = require('path');
const fs = require('fs');
const UTF_8 = "utf8";

function getDirPath(dir, defDirPath) {
    if (fs.existsSync(dir)) {
        return dir;
    } else {
        return path.resolve(__dirname + defDirPath);
    }
}

function getFilePath(file, defFilePath) {
    if (file != null && path.isAbsolute(file)) {
        return configFile;
    } else {
        return path.resolve(__dirname + defFilePath, file);
    }
}

/**
 * Reads json file from configFile and return object
 * @param configFile
 */
module.exports.readFile = function readFile(path, defFilePath) {
    const file = getFilePath(path, defFilePath);
    console.log(' reading config from = ' + file);
    if (fs.existsSync(file)) {
        fs.readFileSync(file, UTF_8);
        return JSON.parse(fs.readFileSync(file));
    } else {
        throw new Error('File ' + file + ' does not exists');
    }
}

/**
 * Reads json file from configFile and return object
 * @param configFile
 */
module.exports.readDir = function readDir(path, defDirPath) {
    const dir = getDirPath(path, defDirPath);
    console.log(' reading config from = ' + dir);
    if (fs.existsSync(dir)) {
        fs.readFileSync(dir, UTF_8);
        return JSON.parse(fs.readFileSync(dir));
    } else {
        throw new Error('dir ' + dir + ' does not exists');
    }
}