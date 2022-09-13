// ***************************************
// REGEXES
// ***************************************

// Matches any well-formed non-empty line, in this format:
// Optional *, then alternating text or string literals (non-greedy), then modifiers, then { and code, or // and a comment
export const LINE_WHOLE =
    /^\s*(((-s|\.s|\$s|-|!!|!|\.\.|~~|~|\$|\+\?|\+|#[^\s]+)\s+)*)(\*{1,3}\s+|(\[|\])\s*(\/\/.*)?$)?(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|\[([^\]]|(\\\\)*\\.)*\]|.*?)+?)((\s+(-s|\.s|\$s|-|!!|!|\.\.|~~|~|\$|\+\?|\+|#[^\s]+))*)(\s+(\{[^}]*$))?(\s*\[\s*)?(\s*(\/\/.*))?\s*$/;

// Matches a line that starts a sequential step block
export const SEQ_MODIFIER_LINE = /^\s*\.\.\s*(\/\/.*)?$/;

// Matches a line that's entirely a // comment
export const FULL_LINE_COMMENT = /^\s*\/\//;

// Matches 'string', handles escaped \ and '
export const SINGLE_QUOTE_STR = /(?<!(\\\\)*\\)('([^\\']|(\\\\)*\\.)*')/g;

// Matches "string", handles escaped \ and "
export const DOUBLE_QUOTE_STR = /(?<!(\\\\)*\\)("([^\\"]|(\\\\)*\\.)*")/g;

// Matches [string], handles escaped \, [, and ]
export const BRACKET_STR = /(?<!(\\\\)*\\)(\[([^\\\]]|(\\\\)*\\.)*\])/g;

// Matches "string", 'string', or [string], handles escaped chars
export const STRING_LITERAL = new RegExp(
    SINGLE_QUOTE_STR.source + '|' + DOUBLE_QUOTE_STR.source + '|' + BRACKET_STR.source,
    'g'
);

// Same as STRING_LITERAL, only matches the whole line
export const STRING_LITERAL_WHOLE = new RegExp('^(' + STRING_LITERAL.source + ')$');

// Matches "string" or 'string', handles escaped chars
export const QUOTED_STRING_LITERAL = new RegExp(SINGLE_QUOTE_STR.source + '|' + DOUBLE_QUOTE_STR.source, 'g');

// Same as QUOTED_STRING_LITERAL, only matches the whole line
export const QUOTED_STRING_LITERAL_WHOLE = new RegExp('^(' + QUOTED_STRING_LITERAL.source + ')$');

// Matches {var} or {{var}}
export const VAR = /\{\{[^{}\\]+\}\}|\{[^{}\\]+\}/g;

// Same as VAR, only matches the whole line
export const VAR_WHOLE = new RegExp('^' + VAR.source + '$');

// Matches {var1} = Val1, {var2} = Val2, {{var3}} = Val3, etc. (minimum one {var}=Val) as the whole line
export const VARS_SET_WHOLE =
    /^(\s*((\{[^{}\\]+\})|(\{\{[^{}\\]+\}\}))\s*(=|is)\s*(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|\[([^\\\]]|(\\\\)*\\.)*\]|.*?)+?)\s*)(,\s*((\{[^{}\\]+\})|(\{\{[^{}\\]+\}\}))\s*(=|is)\s*(('([^\\']|(\\\\)*\\.)*'|"([^\\"]|(\\\\)*\\.)*"|\[([^\\\]]|(\\\\)*\\.)*\]|.*?)+?)\s*)*$/;

// Matches "string", 'string', [string], {var}, or {{var}}, handles escaped chars
export const FUNCTION_INPUT = new RegExp(STRING_LITERAL.source + '|' + VAR.source, 'g');

// Matches a line with only numbers (after whitespace stripped out)
export const NUMBERS_ONLY_WHOLE = /^[0-9.,]+$/;

// ***************************************
// PARSE
// ***************************************
export const SPACES_PER_INDENT = 4;

export const HOOK_NAMES = [
    'before every branch',
    'after every branch',
    'before every step',
    'after every step',
    'before everything',
    'after everything'
] as const;

export const FREQUENCIES = ['high', 'med', 'low'] as const;

// ***************************************
// CONSOLE
// ***************************************
export const CONSOLE_END_COLOR = '\x1b[0m';
export const CONSOLE_START_RED = '\x1b[31m';
export const CONSOLE_START_GRAY = '\x1b[30m';

export const PROP_REGEX_COMMAS =
    /(((?<!(\\\\)*\\)('([^\\']|(\\\\)*\\.)*')|(?<!(\\\\)*\\)("([^\\"]|(\\\\)*\\.)*"))|[^,])*/g; // separate by commas
export const PROP_REGEX_SPACES =
    /(((?<!(\\\\)*\\)('([^\\']|(\\\\)*\\.)*')|(?<!(\\\\)*\\)("([^\\"]|(\\\\)*\\.)*"))|[^ ])*/g; // separate by spaces
export const ORD_REGEX = /^([0-9]+)(st|nd|rd|th)$/;
