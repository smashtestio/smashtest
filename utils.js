const Constants = require('./constants.js');

/**
 * @return {String} str but without leading whitespace and quotes ' or ", returns str if there are no quotes
 */
exports.stripQuotes = function(str) {
    if(exports.hasQuotes(str)) {
        return str.trim().replace(/^'|^"|'$|"$/g, '');
    }
    else {
        return str;
    }
}

/**
 * @return {Boolean} true if str is in 'quotes' or "quotes", false otherwise
 */
exports.hasQuotes = function(str) {
    return str.trim().match(Constants.STRING_LITERAL_REGEX_WHOLE) != null;
}

/**
 * Throws an Error with the given message, filename, and line number
 * @throws {Error}
 */
exports.error = function(msg, filename, lineNumber) {
    throw new Error(msg + " [" + filename + ":" + lineNumber + "]");
}
