const path = require('path');
const fs = require('fs');
const HashMap = require('hashmap');
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
    console.log('reading config from = ' + file);
    if (fs.existsSync(file)) {
        fs.readFileSync(file, UTF_8);
        return JSON.parse(fs.readFileSync(file));
    } else {
        throw new Error('File ' + file + ' does not exists');
    }
}

/**
 * Reads all the json files from directory, and put it in map with filename (without extension) being key
 * @param configFile
 */
module.exports.readDir = function readDir(dirPath, defDirPath) {
    const map = new HashMap();
    const dir = getDirPath(dirPath, defDirPath);
    console.log('reading resources from config DIR = ' + dir);
    fs.readdir(dir, UTF_8, function (err, files) {
        onError(err);
        files.forEach(function (file) {
            try {
                const filePath = path.resolve(dir, file);
                console.log('filePath = ' + filePath);
                map.set(file.substr(file, file.length - '.json'.length), JSON.parse(fs.readFileSync(filePath, UTF_8)));
            } catch (err) {
                console.log('error reading = ' + err);
            }
        });
    });

    function onError(err) {
        if (err) {
            console.error(' error reading config from ' + err);
            throw err;
        }
    }

    return map;
}