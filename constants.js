// REGEXES

// Matches any well-formed non-empty line, in this format:
// Optional *, then alternating text or "string literal" or 'string literal' (non-greedy), then identifiers, then { and code, or // and a comment
exports.LINE_REGEX_WHOLE = /^\s*(\*\s+)?(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)((\s+(\-T|\-M|\-|\~|\~\~|\$|\+|\.\.|\#))*)(\s+(\{[^\}]*$))?(\s*(\/\/.*))?\s*$/;
// Matches "string" or 'string', handles escaped \ and "
exports.STRING_LITERAL_REGEX = /(?<!(\\\\)*\\)('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*")/g;
// Same as STRING_LITERAL_REGEX, only matches the whole line
exports.STRING_LITERAL_REGEX_WHOLE = new RegExp("^" + exports.STRING_LITERAL_REGEX.source + "$");
// Matches {var1} = Val1, {var2} = Val2, {{var3}} = Val3, etc. (minimum one {var}=Val) as the whole line
exports.VARS_SET_REGEX_WHOLE = /^(\s*((\{[^\{\}\\]+\})|(\{\{[^\{\}\\]+\}\}))\s*\=\s*(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)\s*)(\,\s*((\{[^\{\}\\]+\})|(\{\{[^\{\}\\]+\}\}))\s*\=\s*(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)\s*)*$/;
// Matches {var} or {{var}}
exports.VAR_REGEX = /\{[^\{\}\\]+\}|\{\{[^\{\}\\]+\}\}/g;
// Matches [text]
exports.BRACKET_REGEX = /(?<!(\\\\)*\\)\[[^\[\]\\]+\]/g;
// Matches an [ElementFinder] in this format:
// [ OPTIONAL(1st/2nd/3rd/etc.)   MANDATORY('TEXT' AND/OR VAR-NAME)   OPTIONAL(next to 'TEXT') ]
exports.ELEMENTFINDER_REGEX = /(?<!(\\\\)*\\)\[\s*(([0-9]+)(st|nd|rd|th))?\s*(('[^']+?'|"[^"]+?")|([^"']+?)|(('[^']+?'|"[^"]+?")\s+([^"']+?)))\s*(next\s+to\s+('[^']+?'|"[^"]+?"))?\s*\]/g;
// Same as ELEMENTFINDER_REGEX, only matches the whole line
exports.ELEMENTFINDER_REGEX_WHOLE = new RegExp("^\\s*" + exports.ELEMENTFINDER_REGEX.source + "\\s*$");
// Matches a {var}, {{var}}, 'string', "string", or [ElementFinder]
exports.FUNCTION_INPUT = new RegExp("(" + exports.VAR_REGEX.source + ")|(" + exports.STRING_LITERAL_REGEX.source + ")|(" + exports.ELEMENTFINDER_REGEX.source + ")", "g");
// Matches a line with only numbers (after whitespace stripped out)
exports.NUMBERS_ONLY_REGEX_WHOLE = /^[0-9\.\,]+$/;

// PARSE CONFIG
exports.SPACES_PER_INDENT = 4;

// MISC CONSTANTS
exports.HOOK_NAMES_CANON = ['before every branch', 'after every branch', 'before every step', 'after every step', 'before everything', 'after everything'];
exports.HOOK_NAMES =       ['Before Every Branch', 'After Every Branch', 'Before Every Step', 'After Every Step', 'Before Everything', 'After Everything'];
