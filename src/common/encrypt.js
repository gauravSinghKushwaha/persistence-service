const conf = require('./../config/config');
const log = require('./../log/logger');
const crypto = require('crypto');

const UTF8 = 'utf8';
const HEX = 'hex';
const config = conf.config;

const algorithm = config.encrypt.algorithm == null ? 'aes-256-ctr' : config.encrypt.algorithm;
const privateKey = config.encrypt.key == null ? '1@3$5^7*9)-+' : config.encrypt.key;
const hashAlgo = config.encrypt.hashalgo == null ? 'aes-256-ctr' : config.encrypt.hashalgo;
const salt = config.encrypt.salt == null ? '1@3$5^7*9)-+' : config.encrypt.salt;

const cipher = crypto.createCipher(algorithm, privateKey);
const decipher = crypto.createDecipher(algorithm, privateKey);

log.debug('algorithm=' + algorithm + ' privateKey=' + privateKey + ' hashAlgo=' + hashAlgo + ' salt=' + salt);

function decrypt(text) {
    var decipher = crypto.createDecipher(algorithm, privateKey);
    var dec = decipher.update(text, HEX, UTF8);
    dec += decipher.final(UTF8);
    log.debug('text = ' + text + ' decrypt = ' + decrypt);
    return dec;
}

function encrypt(text) {
    var cipher = crypto.createCipher(algorithm, privateKey);
    var crypted = cipher.update(text, UTF8, HEX);
    crypted += cipher.final(HEX);
    log.debug('text = ' + text + ' crypted = ' + crypted);
    return crypted;
}

module.exports = {
    hashText: function hashText(text) {
        var hash = crypto.createHash(hashAlgo).update(salt + text + salt).digest(HEX);
        log.debug('text = ' + text + ' salt = ' + salt + ' hash = ' + hash);
        return hash;
    },
    /**
     * Encrypt text, could be decryptex by decryptWithUserPwd
     * @param  {[type]} plainText [description]
     * @param  {[type]} userPwd        [description]
     * @return {[type]}           [description]
     */
    ecryptWithUserPwd: function ecryptWithUserPwd(plainText, userPwd) {
        var encryptedText = encrypt(plainText, userPwd);
        var hash = hashText(encryptedText);
        return encryptedText + "$" + hash;
    },
    /**
     * decrypt text ecnrypted via ecryptWithUserPwd
     * @param  {[type]} encryptedAndAuthenticatedText [description]
     * @param  {[type]} userPwd                            [description]
     * @return {[type]}                               [description]
     */
    decryptWithUserPwd: function decryptWithUserPwd(encryptedText, userPwd) {
        var encryptedAndHashArray = encryptedText.split("$");
        var encrypted = encryptedAndHashArray[0];
        var hash = encryptedAndHashArray[1];
        var hash2Compare = hashText(encrypted);
        if (hash === hash2Compare) {
            return decrypt(encrypted, userPwd);
        }
    }
};
