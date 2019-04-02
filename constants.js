// ***************************************
// REGEXES
// ***************************************

// Matches any well-formed non-empty line, in this format:
// Optional *, then alternating text or "string literal" or 'string literal' (non-greedy), then identifiers, then { and code, or // and a comment
exports.LINE_WHOLE = /^\s*(\*\s+)?(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)((\s+(\-T|\-M|\-|\~|\$|\+|\.\.|\#))*)(\s+(\{[^\}]*$))?(\s*(\/\/.*))?\s*$/;

// Matches a line that's entirely a // comment
exports.FULL_LINE_COMMENT = /^\s*\/\//;

// Matches 'string', handles escaped \ and '
exports.SINGLE_QUOTE_STR = /(?<!(\\\\)*\\)('([^\\']|(\\\\)*\\.)*')/g;

// Matches "string", handles escaped \ and "
exports.DOUBLE_QUOTE_STR = /(?<!(\\\\)*\\)("([^\\"]|(\\\\)*\\.)*")/g;

// Matches [string], handles escaped \, [, and ]
exports.BRACKET_STR = /(?<!(\\\\)*\\)(\[([^\\\]]|(\\\\)*\\.)*\])/g;

// Matches "string", 'string', or [string], handles escaped chars
exports.STRING_LITERAL = new RegExp(exports.SINGLE_QUOTE_STR.source + "|" + exports.DOUBLE_QUOTE_STR.source + "|" + exports.BRACKET_STR.source, "g");

// Same as STRING_LITERAL, only matches the whole line
exports.STRING_LITERAL_WHOLE = new RegExp("^(" + exports.STRING_LITERAL.source + ")$");

// Matches {var} or {{var}}
exports.VAR = /\{\{[^\{\}\\]+\}\}|\{[^\{\}\\]+\}/g;

// Same as VAR, only matches the whole line
exports.VAR_WHOLE = new RegExp("^" + exports.VAR.source + "$");

// Matches {var1} = Val1, {var2} = Val2, {{var3}} = Val3, etc. (minimum one {var}=Val) as the whole line
exports.VARS_SET_WHOLE = /^(\s*((\{[^\{\}\\]+\})|(\{\{[^\{\}\\]+\}\}))\s*\=\s*(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|\[([^\\\]]|(\\\\)*\\.)*\]|.*?)+?)\s*)(\,\s*((\{[^\{\}\\]+\})|(\{\{[^\{\}\\]+\}\}))\s*\=\s*(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|\[([^\\\]]|(\\\\)*\\.)*\]|.*?)+?)\s*)*$/;

// Matches "string", 'string', [string], {var}, or {{var}}, handles escaped chars
exports.FUNCTION_INPUT = new RegExp(exports.STRING_LITERAL.source + "|" + exports.VAR.source, "g");

// Matches a line with only numbers (after whitespace stripped out)
exports.NUMBERS_ONLY_WHOLE = /^[0-9\.\,]+$/;

// ***************************************
// PARSE CONFIG
// ***************************************
exports.SPACES_PER_INDENT = 4;

// ***************************************
// MISC CONSTANTS
// ***************************************
exports.HOOK_NAMES = ['before every branch', 'after every branch', 'before every step', 'after every step', 'before everything', 'after everything'];
