import util from 'node:util';
import invariant from 'tiny-invariant';
import * as tsNode from 'ts-node';
import * as Constants from './constants.js';
import { SerializedSmashError, SmashError } from './types.js';

/**
 * @return {String} str but without leading whitespace and quotes ('', "", []), returns str if there are no quotes
 */
export const stripQuotes = (str: string) => {
    if (hasQuotes(str)) {
        return str.trim().replace(/^'|^"|'$|"$|^\[|\]$/g, '');
    }
    else {
        return str;
    }
};

/**
 * @return {String} str but without {{, }}, {, or }, and then trimmed
 */
export const stripBrackets = (str: string) => {
    return str.replace(/^\{\{|\}\}$|^\{|\}$/g, '').trim();
};

/**
 * @return {Boolean} true if str is in 'quotes', "quotes", or [quotes], false otherwise
 */
export const hasQuotes = (str: string) => {
    return str.trim().match(/^'.*'$|^".*"$|^\[.*\]$/) !== null;
};

/**
 * Throws an Error with the given message, filename, and line number
 * @throws {Error}
 */
export const error = (msg?: string, filename?: string, lineNumber?: number, outputStack = false) => {
    if (filename || lineNumber) {
        throw Object.assign(new Error(`${msg} [${filename || ''}:${lineNumber || ''}]`), { outputStack });
    }
    else {
        throw Object.assign(new Error(msg), { outputStack });
    }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assert(condition: any, msg?: string, filename?: string, lineNumber?: number): asserts condition {
    if (condition) {
        return;
    }

    error(msg, filename, lineNumber);
}

/**
 * Logs the given object to console
 */
export const log = (obj: unknown) => {
    console.log(util.inspect(obj, { depth: null }));
};

/**
 * @return {String} str, but with ` and & escaped to &#96; and &amp;
 */
export const escapeBackticks = (str: string) => {
    return str.replace(/&/g, '&amp;').replace(/`/g, '&#96;');
};

/**
 * @return {String} str, but with &#96; and &amp; unescaped to ` and &
 */
export const unescapeBackticks = (str: string) => {
    return str.replace(/&#96;/g, '`').replace(/&amp;/g, '&');
};

/**
 * @return {String} str, but with \ escaped to \\, " escaped to \", etc.
 */
export const escape = (str: string) => {
    let newStr = '';
    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        switch (c) {
        case '\\':
            newStr += '\\\\';
            break;
        case '"':
            newStr += '\\"';
            break;
        case '\'':
            newStr += '\\\'';
            break;
        case '[':
            newStr += '\\[';
            break;
        case ']':
            newStr += '\\]';
            break;
        case '\n':
            newStr += '\\n';
            break;
        case '\r':
            newStr += '\\r';
            break;
        case '\t':
            newStr += '\\t';
            break;
        case '\b':
            newStr += '\\b';
            break;
        case '\f':
            newStr += '\\f';
            break;
        case '\v':
            newStr += '\\v';
            break;
        case '\0':
            newStr += '\\0';
            break;
        default:
            newStr += c;
        }
    }

    return newStr;
};

/**
 * @return {String} str, but with \\ unescaped to \, \" unescaped to ", etc.
 */
export const unescape = (str: string) => {
    return str.replace(/\\(.)/g, (match, p1) => {
        switch (match) {
        case '\\\\':
            return '\\';
        case '\\"':
            return '"';
        case '\\\'':
            return '\'';
        case '\\[':
            return '[';
        case '\\]':
            return ']';
        case '\\n':
            return '\n';
        case '\\r':
            return '\r';
        case '\\t':
            return '\t';
        case '\\b':
            return '\b';
        case '\\f':
            return '\f';
        case '\\v':
            return '\v';
        case '\\0':
            return '\0';
        default:
            return p1;
        }
    });
};

// @todo Unreferenced
// /**
//  * Prints an array of branches to console
//  * @param {Tree} tree - The tree in which the branches live
//  * @param {Array} Array of Branch to print out
//  */
// export const printBranches = (tree: Tree, branches: Branch[]) => {
//     branches.forEach((branch, idx) => {
//         console.log(branch.output(tree.stepNodeIndex, 'Branch ' + idx));
//     });
// };

/**
 * @return {String} text, but in a canonical format (trimmed, all lowercase, and all whitespace replaced with a single space)
 */
export const canonicalize = (text: string) => {
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
};

/**
 * @return {String} text, but in a canonical format (trimmed, and all whitespace replaced with a single space)
 */
export const keepCaseCanonicalize = (text: string) => {
    return text.trim().replace(/\s+/g, ' ');
};

/**
 * @param {String} line - A single line
 * @param {String} filename - The filename of the file where the line is
 * @param {Integer} lineNumber - The line number
 * @return {Integer} The number of indents in line (where each SPACES_PER_INDENT spaces counts as 1 indent). Always returns 0 for empty string or all whitespace.
 * @throws {Error} If there are an invalid number of spaces, or invalid whitespace chars, at the beginning of the step
 */
export const numIndents = (line: string, filename?: string, lineNumber?: number) => {
    if (line.match(/^\s*$/)) {
        // empty string or all whitespace
        return 0;
    }
    if (line.match(Constants.FULL_LINE_COMMENT)) {
        // comment
        return 0;
    }

    // These should always match
    const spacesAtFront = line.match(/^( *)([^ ]|$)/);
    const whitespaceAtFront = line.match(/^(\s*)([^\s]|$)/);

    invariant(spacesAtFront && whitespaceAtFront);

    if (spacesAtFront[1] !== whitespaceAtFront[1]) {
        error('Spaces are the only type of whitespace allowed at the beginning of a step', filename, lineNumber);
    }

    const numSpaces = spacesAtFront[1].length;
    const numIndents = numSpaces / Constants.SPACES_PER_INDENT;

    if (numIndents - Math.floor(numIndents) !== 0) {
        error(
            `The number of spaces at the beginning of a line must be a multiple of ${
                Constants.SPACES_PER_INDENT
            }. You have ${numSpaces} space${numSpaces !== 1 ? 's' : ''}.`,
            filename,
            lineNumber
        );
    }

    return numIndents;
};

/**
 * @param {Number} indents - Number of indents
 * @param {Number} [spacesPerIndent] - Spaces per indent, omit to use default
 * @return {String} n indents worth of spaces
 */
export const getIndentWhitespace = (indents?: number, spacesPerIndent?: number) => {
    let spaces = '';
    for (let i = 0; i < (spacesPerIndent || Constants.SPACES_PER_INDENT) * (indents || 0); i++) {
        spaces += ' ';
    }
    return spaces;
};

/**
 * Call during big tasks in async code so as not to hog the event loop
 */
export const breather = async () => {
    await new Promise((r) => setTimeout(r, 0));
};

/**
 * @param {Object} destination - The object to receive properties
 * @param {Object} source - The object whose properties to copy
 * @param {Array of String} props - The properties to copy over
 */
export const copyProps = (
    destination: { [key: string]: unknown },
    source: { [key: string]: unknown },
    props: string[]
) => {
    props.forEach((prop) => {
        if (source[prop] !== undefined) {
            destination[prop] = source[prop];
        }
    });
};

/**
 * @return {Object} Converts Error into a simple js object
 */
export const serializeError = (error: SmashError): SerializedSmashError => {
    return {
        message: error.message,
        stack: error.stack,
        filename: error.filename,
        lineNumber: error.lineNumber,
        ...(error.continue && { continue: true })
    };
};

/**
 * @return {String} The string s, with spaces added to the end to make it length len (only if the string's length is < len)
 */
export const addWhitespaceToEnd = (s: string, len: number) => {
    while (s.length < len) {
        s += ' ';
    }
    return s;
};

/**
 * @return {String} Different normalization steps on pathnames and glob patterns for Windows
 */
export function normalizePathname(pathname: string) {
    // Strip leading '/' from Windows '/C:/paths' from URL().pathname
    // See https://github.com/nodejs/node/issues/23026#issuecomment-423754481
    let path = process.platform !== 'win32' ? pathname : pathname.replace(/^\/(?=\w:)/, '');

    // The 'glob' package only accepts forward slash paths
    path = path.replace(/\\/g, '/');

    return path;
}

const compiler = tsNode.create({
    transpileOnly: true,
    swc: false,
    compilerOptions: {
        target: 'es5',
        module: 'esnext'
    }
});

/**
 * Compiles a function to ES5. It includes the helpers as well, so async/await
 * and things like that can go as well.
 * @param fn Function to be compiled
 * @returns Compiled function
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function es5<Func extends Function>(func: Func): Func {
    const script = `return (${func.toString()}).apply(null, arguments)`;
    const compiled = compiler.compile(script, '');
    return eval(`(function () { ${compiled}\n })`);
}
