const conf = require('./../config/config');
const log = require('./../log/logger');
const crypto = require('crypto');

const UTF8 = 'utf8';
const HEX = 'hex';
const config = conf.config;

const algorithm = config.encrypt.algorithm == null ? 'aes-256-ctr' : config.encrypt.algorithm;
const privateKey = config.encrypt.key == null ? '1@3$5^7*9)-+' : config.encrypt.key;
const hashAlgo = config.encrypt.hashalgo == null ? 'sha256' : config.encrypt.hashalgo;
const salt = config.encrypt.salt == null ? '1@3$5^7*9)-+' : config.encrypt.salt;

log.debug('algorithm=' + algorithm + ' privateKey=' + privateKey + ' hashAlgo=' + hashAlgo + ' salt=' + salt);

function decrypt(text) {
    const decipher = crypto.createDecipher(algorithm, privateKey);
    var dec = decipher.update(text, HEX, UTF8);
    dec += decipher.final(UTF8);
    log.debug('text = ' + text + ' decrypt = ' + decrypt);
    return dec;
}

function encrypt(text) {
    const cipher = crypto.createCipher(algorithm, privateKey);
    var crypted = cipher.update(text, UTF8, HEX);
    crypted += cipher.final(HEX);
    log.debug('text = ' + text + ' crypted = ' + crypted);
    return crypted;
}

module.exports = {
    hashText: function (text) {
        var hash = crypto.createHash(hashAlgo).update(salt + text + salt).digest(HEX);
        log.debug('text = ' + text + ' salt = ' + salt + ' hash = ' + hash);
        return hash;
    },
    /**
     * Encrypt text, could be decrypted by decrypt
     * @param  {[type]} plainText [description]
     * @return {[type]}           [description]
     */
    encryptText: function (plainText) {
        var encryptedText = encrypt(plainText);
        var hash = this.hashText(encryptedText);
        return encryptedText + "$" + hash;
    },
    /**
     * decrypt text ecnrypted via ecrypt
     * @return {[type]}                               [description]
     */
    decryptText: function (encryptedText) {
        var encryptedAndHashArray = encryptedText.split("$");
        var encrypted = encryptedAndHashArray[0];
        var hash = encryptedAndHashArray[1];
        var hash2Compare = this.hashText(encrypted);
        if (hash === hash2Compare) {
            return decrypt(encrypted);
        }
    }
};
