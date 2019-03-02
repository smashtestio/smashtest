/**
 * @return {String} str but without leading 'quotes' or "quotes"
 */
exports.stripQuotes = function(str) {
    return str.replace(/^'|^"|'$|"$/g, '');
}
