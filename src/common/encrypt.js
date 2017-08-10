const conf = require('./../config/config');
const log = require('./../log/logger');
const crypto = require('crypto');

const UTF8 = 'utf8';
const HEX = 'hex';
const config = conf.config;

function Crypt() {
    this.algorithm = config.encrypt.algorithm == null ? 'aes-256-ctr' : config.encrypt.algorithm;
    this.privateKey = config.encrypt.key == null ? '1@3$5^7*9)-+' : config.encrypt.key;
    this.hashAlgo = config.encrypt.hashalgo == null ? 'sha256' : config.encrypt.hashalgo;
    this.salt = config.encrypt.salt == null ? '1@3$5^7*9)-+' : config.encrypt.salt;
    log.debug('algorithm=' + this.algorithm + ' privateKey=' + this.privateKey + ' hashAlgo=' + this.hashAlgo + ' salt=' + this.salt);
}

Crypt.prototype.encryptText = function (plainText) {
    var encryptedText = this.encrypt(plainText);
    var hash = this.hashText(encryptedText);
    return encryptedText + "$" + hash;
};

Crypt.prototype.hashText = function (text) {
    var hash = crypto.createHash(this.hashAlgo).update(this.salt + text + this.salt).digest(HEX);
    log.debug('text = ' + text + ' salt = ' + this.salt + ' hash = ' + hash);
    return hash;
};

Crypt.prototype.decryptText = function (encryptedText) {
    var encryptedAndHashArray = encryptedText.split("$");
    var encrypted = encryptedAndHashArray[0];
    var hash = encryptedAndHashArray[1];
    var hash2Compare = this.hashText(encrypted);
    if (hash === hash2Compare) {
        return this.decrypt(encrypted);
    }
};

Crypt.prototype.decrypt = function (text) {
    const decipher = crypto.createDecipher(this.algorithm, this.privateKey);
    var dec = decipher.update(text, HEX, UTF8);
    dec += decipher.final(UTF8);
    log.debug('text = ' + text + ' decrypt = ' + dec);
    return dec;
};

Crypt.prototype.encrypt = function (text) {
    const cipher = crypto.createCipher(this.algorithm, this.privateKey);
    var crypted = cipher.update(text, UTF8, HEX);
    crypted += cipher.final(HEX);
    log.debug('text = ' + text + ' crypted = ' + crypted);
    return crypted;
};

module.exports = new Crypt();
