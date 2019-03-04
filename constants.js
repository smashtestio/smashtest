// REGEXES

// Matches any well-formed non-empty line, in this format:
// Optional *, then alternating text or "string literal" or 'string literal' (non-greedy), then identifiers, then { and code, or // and a comment
exports.LINE_REGEX = /^\s*(\*\s+)?(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)((\s+(\-T|\-M|\-|\~|\~\~|\$|\+|\.\.|\#))*)(\s+(\{[^\}]*$))?(\s*(\/\/.*))?\s*$/;
// Matches "string" or 'string', handles escaped \ and "
exports.STRING_LITERAL_REGEX_WHOLE = /^('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*")$/;
exports.STRING_LITERAL_REGEX = /(?<!(\\\\)*\\)'([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"/g;
// Matches {var1} = Val1, {var2} = Val2, {{var3}} = Val3, etc. (minimum one {var}=Val)
exports.VARS_SET_REGEX = /^(\s*((\{[^\{\}\\]+\})|(\{\{[^\{\}\\]+\}\}))\s*\=\s*(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)\s*)(\,\s*((\{[^\{\}\\]+\})|(\{\{[^\{\}\\]+\}\}))\s*\=\s*(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|.*?)+?)\s*)*$/;
// Matches {var} or {{var}}
exports.VAR_REGEX = /\{[^\{\}\\]+\}|\{\{[^\{\}\\]+\}\}/g;
// Matches [text]
exports.BRACKET_REGEX = /\[[^\[\]\\]+\]/g;
// Matches an ElementFinder in this format:
// OPTIONAL(1st/2nd/3rd/etc.)   MANDATORY('TEXT' AND/OR VAR-NAME)   OPTIONAL(next to 'TEXT')
exports.ELEMENTFINDER_REGEX = /^\s*(([0-9]+)(st|nd|rd|th))?\s*(('[^']+?'|"[^"]+?")|([^"']+?)|(('[^']+?'|"[^"]+?")\s+([^"']+?)))\s*(next\s+to\s+('[^']+?'|"[^"]+?"))?\s*$/;
// Matches a line with only numbers (after whitespace stripped out)
exports.NUMBERS_ONLY_REGEX = /^[0-9\.\,]+$/;
// Matches \' or \\\' or \\\\\' etc.
exports.ESCAPED_SINGLE_QUOTE = /(\\\\)*\\'/g;

// PARSE CONFIG

exports.SPACES_PER_INDENT = 4;
