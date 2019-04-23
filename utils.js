const util = require('util');
const Constants = require('./constants.js');

/**
 * @return {String} str but without leading whitespace and quotes ' or ", returns str if there are no quotes
 */
exports.stripQuotes = (str) => {
    if(exports.hasQuotes(str)) {
        return str.trim().replace(/^'|^"|'$|"$|^\[|\]$/g, '');
    }
    else {
        return str;
    }
}

/**
 * @return {String} str but without {{, }}, {, or }, and then trimmed
 */
exports.stripBrackets = (str) => {
    return str.replace(/^\{\{|\}\}$|^\{|\}$/g, '').trim();
}

/**
 * @return {Boolean} true if str is in 'quotes' or "quotes", false otherwise
 */
exports.hasQuotes = (str) => {
    return str.trim().match(Constants.STRING_LITERAL_WHOLE) != null;
}

/**
 * Throws an Error with the given message, filename, and line number
 * @throws {Error}
 */
exports.error = (msg, filename, lineNumber) => {
    if(filename || lineNumber) {
        throw new Error(`${msg} [${filename}:${lineNumber}]`);
    }
    else {
        throw new Error(msg);
    }
}

/**
 * Logs the given object to console
 */
exports.log = (obj) => {
    console.log(util.inspect(obj, {depth: null}));
}

/**
 * @return {String} str, but with html-sensitive chars escaped to html entities
 */
exports.escapeHtml = (str) => {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * @return {String} str, but with html entities unescaped to their actual chars
 */
exports.unescapeHtml = (str) => {
    return str
        .replace(/&#039;/g, "'")
        .replace(/&quot;/g, "\"")
        .replace(/&gt;/g, ">")
        .replace(/&lt;/g, "<")
        .replace(/&amp;/g, "&");
}

/**
 * @return {String} str, but with \\ unescaped to \, \" unescaped to ", etc.
 */
exports.unescape = (str) => {
    return str
        .replace(/\\\\/g, '\\') // replace \\ with \
        .replace(/\\\'/g, '\'') // replace \' with '
        .replace(/\\\"/g, '\"') // replace \" with "
        .replace(/\\\[/g, '[') // replace \[ with [
        .replace(/\\\]/g, ']') // replace \] with [
        .replace(/\\n/g, '\n') // replace \n with newline
        .replace(/\\r/g, '\r') // replace \r with carriage return
        .replace(/\\t/g, '\t') // replace \r with tab
        .replace(/\\b/g, '\b') // replace \b with backspace char
        .replace(/\\f/g, '\f') // replace \b with formfeed char
        .replace(/\\v/g, '\v') // replace \v with vertical tab
        .replace(/\\0/g, '\0'); // replace \0 with null char
}

/**
 * @return {String} str, but with \ escaped to \\, " escaped to \", etc.
 */
exports.escape = (str) => {
    return exports.stripQuotes(JSON.stringify(str));
}

/**
 * Prints an array of branches to console
 * @param {Array} Array of Branch to print out
 */
exports.printBranches = (branches) => {
    for(let i = 0; i < branches.length; i++) {
        console.log(branches[i].output("Branch " + i));
    }
}

/**
 * @return {String} A random string of characters
 */
exports.randomId = () => {
    let id = '';
    for(let i = 0; i < 4; i++) {
        id += Math.random().toString(36).substr(2, 34);
    }
    return id;
}

/**
 * @return {String} text, but in a canonical format (trimmed, all lowercase, and all whitespace replaced with a single space)
 */
exports.canonicalize = (text) => {
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * @return {String} text, but in a canonical format (trimmed, and all whitespace replaced with a single space)
 */
exports.keepCaseCanonicalize = (text) => {
    return text.trim().replace(/\s+/g, ' ');
}
