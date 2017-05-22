const config = require('./../config/config');
const log = require('./../log/logger');
const crypto = require('crypto');

const algorithm = config.encrypt.algorithm == null ? 'aes-256-ctr' : config.encrypt.algorithm;
const privateKey = config.encrypt.key == null ? '1@3$5^7*9)-+' : config.encrypt.key;
const hashAlgo = config.encrypt.hashalgo == null ? 'aes-256-ctr' : config.encrypt.hashalgo;
const salt = config.encrypt.salt == null ? '1@3$5^7*9)-+' : config.encrypt.salt;
const cipher = crypto.createCipher(algorithm, privateKey);
const decipher = crypto.createDecipher(algorithm, privateKey);

log.debug('algorithm=' + algorithm + ' privateKey=' + privateKey + ' hashAlgo=' + hashAlgo + ' salt=' + salt);

function decrypt(password) {
  var decipher = crypto.createDecipher(algorithm, privateKey);
  var dec = decipher.update(password, 'hex', 'utf8');
  dec += decipher.final('utf8');
  log.debug('text = ' + password + ' decrypt = ' + decrypt);
  return dec;
}

function encrypt(password) {
  var cipher = crypto.createCipher(algorithm, privateKey);
  var crypted = cipher.update(password, 'utf8', 'hex');
  crypted += cipher.final('hex');
  log.debug('text = ' + password + ' crypted = ' + crypted);
  return crypted;
}

module.exports.hashText = function hashText(text) {
  var hash = crypto.createHash(hashAlgo).update(salt + text + salt).digest("hex");
  log.debug('text = ' + text + ' salt = ' + salt + ' hash = ' + hash);
  return hash;
}
/**
 * Encrypt text, could be decryptex by decryptWithUserPwd
 * @param  {[type]} plainText [description]
 * @param  {[type]} pw        [description]
 * @return {[type]}           [description]
 */
module.exports.ecryptWithUserPwd = function ecryptWithUserPwd(plainText, pw) {
  var encryptedText = encrypt(plainText, pw);
  var hash = hashText(encryptedText);
  return encryptedText + "$" + hash;
}
/**
 * decrypt text ecnrypted via ecryptWithUserPwd
 * @param  {[type]} encryptedAndAuthenticatedText [description]
 * @param  {[type]} pw                            [description]
 * @return {[type]}                               [description]
 */
module.exports.decryptWithUserPwd = function decryptWithUserPwd(encryptedText, pw) {
  var encryptedAndHashArray = encryptedText.split("$");
  var encrypted = encryptedAndHashArray[0];
  var hash = encryptedAndHashArray[1];
  var hash2Compare = hashText(encrypted);
  if (hash === hash2Compare) {
    return decrypt(encrypted, pw);
  }
}
