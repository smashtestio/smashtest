import cloneDeep from 'lodash/cloneDeep.js';
import invariant from 'tiny-invariant';
import * as Constants from '../../core/constants.js';
import { ComparisonBase, Constraints, ConstraintsInstruction, ElementFinderError } from '../../core/types.js';
import * as utils from '../../core/utils.js';

export const RESERVED_KEYWORDS: (keyof ConstraintsInstruction)[] = [
    '$typeof',
    '$regex',
    '$contains',
    '$max',
    '$min',
    '$code',
    '$length',
    '$maxLength',
    '$minLength',
    '$subset',
    '$anyOrder',
    '$exact',
    '$every'
];

/**
 * Replaces a value inside an object to mark that the Comparer was there, and to store any associated errors
 */
export class ComparerNode {
    errors;
    value;

    constructor(errors: ElementFinderError[], value: unknown) {
        this.errors = errors; // array of strings describing errors related to comparison
        this.value = value; // original actual value at the position of this ComparerNode
        //this.$comparerNode = true;
    }
}

class Comparer {
    static defaultErrorStart = Constants.CONSOLE_END_COLOR + Constants.CONSOLE_START_RED + '-->';
    static defaultErrorEnd = Constants.CONSOLE_END_COLOR + Constants.CONSOLE_START_GRAY;
    static seen?: unknown[];

    /**
     * Compares the actual object against the expected object
     * Usage: expect(actualObj, errorStart, errorEnd, jsonClone).to.match(expectedObj)
     * @param {Object} actualObj - The object to check. Must not have circular references or multiple references to the same object inside. Could be an array.
     * @param {Object} expectedObj - The object specifying criteria for actualObj to match
     * @param {String} [errorStart] - String to mark the start of an error, '-->' with ANSI color codes if omitted
     * @param {String} [errorEnd] - String to mark the end of an error, '' with ANSI color codes if omitted
     * @param {String} [errorHeader] - String to put at the top of the entire error message, '' if omitted
     * @param {Boolean} [jsonClone] - If true, compares using the rough clone method, aka JSON.stringify + JSON.parse (which handles multiple references to the same object inside actualObj, but also removes functions and undefineds, and converts them to null in arrays)
     * @throws {Error} If actualObj doesn't match expectedObj
     */
    static expect(
        actualObj: ComparisonBase,
        errorStart?: string,
        errorEnd?: string,
        errorHeader?: string,
        jsonClone?: boolean
    ) {
        if (errorStart === undefined) {
            errorStart = Comparer.defaultErrorStart;
        }
        if (errorEnd === undefined) {
            errorEnd = Comparer.defaultErrorEnd;
        }

        return {
            to: {
                match: (expectedObj: Constraints) => {
                    actualObj = this.clone(actualObj, jsonClone);

                    const comp = this.comparison(actualObj, expectedObj);
                    if (this.hasErrors(comp)) {
                        throw new Error(
                            '\n' + (errorHeader ? errorHeader + '\n' : '') + Comparer.print(comp, errorStart, errorEnd)
                        );
                    }
                }
            }
        };
    }

    /**
     * Compares the actual value against the expected value
     * Calls itself recursively on every object, array, and primitive inside of actual
     * Replaces every object, array, and primitive inside of actual with a special ComparerNode object
     * @param {Anything} actual - The value to check (could be a plain object, array, or primitive)
     * @param {Anything} expected - Criteria for actual to match (could be a primitive, object, or array to match exactly or an object/array that specifies constraints)
     * @param {Boolean} [subsetMatching] - If true, all objects and arrays are matched by subset (not just objects, as is the default)
     * @return {ComparerNode} A ComparerNode
     */
    static comparison(actual: unknown, expected: unknown, subsetMatching?: boolean) {
        const originalActual = actual;
        if (actual instanceof ComparerNode) {
            // we've already been here
            actual = actual.value;
        }

        const errors: ElementFinderError[] = [];

        if (typeof expected === 'object') {
            if (expected === null) {
                // remember, typeof null is "object"
                if (actual !== null) {
                    errors.push('not null');
                }
            }
            else if (expected instanceof Array) {
                if (!(actual instanceof Array)) {
                    errors.push('not an array');
                }
                else {
                    let subset = false;
                    let anyOrder = false;

                    // [ '$subset', A, B, ... ]
                    if (expected.indexOf('$subset') !== -1 || subsetMatching) {
                        subset = true;
                    }

                    // [ '$anyOrder', A, B, ... ]
                    if (expected.indexOf('$anyOrder') !== -1) {
                        anyOrder = true;
                    }

                    // Make sure every expected item has a corresponding actual item
                    for (let expectedIndex = 0, actualIndex = 0; expectedIndex < expected.length; expectedIndex++) {
                        const expectedItem = expected[expectedIndex];
                        if (['$subset', '$anyOrder'].indexOf(expectedItem) == -1) {
                            if (subset || anyOrder) {
                                // corresponding actual item can be anywhere
                                const actualClone = this.clone(actual);
                                let found = false;
                                for (let i = 0; i < actualClone.length; i++) {
                                    const actualItem = actualClone[i];
                                    const comparisonResult = this.comparison(actualItem, expectedItem, true);
                                    if (!this.hasErrors(comparisonResult)) {
                                        // we have a match
                                        found = true;
                                        actual[i] = comparisonResult;
                                        break;
                                    }
                                }

                                if (!found) {
                                    errors.push({ blockError: true, text: 'missing', obj: expectedItem });
                                }
                            }
                            else {
                                // corresponding actual item has to be at the same index
                                actual[actualIndex] = this.comparison(
                                    actual[actualIndex],
                                    expected[expectedIndex],
                                    subsetMatching
                                );
                            }

                            actualIndex++;
                        }
                    }

                    if (!subset) {
                        // Make sure we don't have any items in actual that haven't been visited
                        for (let i = 0; i < actual.length; i++) {
                            if (!(actual[i] instanceof ComparerNode)) {
                                actual[i] = this.createComparerNode(['not expected'], actual[i]);
                            }
                        }
                    }
                }
            }
            else {
                // expected is a plain object
                // { $typeof: "type" }
                if ('$typeof' in expected) {
                    // Validate expected
                    if (typeof expected.$typeof !== 'string') {
                        throw new Error(`$typeof has to be a string: ${expected.$typeof}`);
                    }

                    // Validate actual matches expected
                    if (expected.$typeof.toLowerCase() === 'array') {
                        if (!(actual instanceof Array)) {
                            errors.push('not $typeof array');
                        }
                    }
                    else if (typeof actual != expected.$typeof) {
                        errors.push(`not $typeof ${expected.$typeof}`);
                    }
                }

                // { $regex: /regex/ } or { $regex: "regex" }
                if ('$regex' in expected) {
                    // Validate expected
                    let regex = null;
                    if (typeof expected.$regex === 'string') {
                        regex = new RegExp(expected.$regex);
                    }
                    else if (expected.$regex instanceof RegExp) {
                        regex = expected.$regex;
                    }
                    else {
                        throw new Error(`$regex has to be a /regex/ or "regex": ${expected.$regex}`);
                    }

                    // Validate actual matches expected
                    if (typeof actual != 'string') {
                        errors.push(`isn't a string so can't match $regex /${regex.source}/`);
                    }
                    else if (!actual.match(regex)) {
                        errors.push(`doesn't match $regex /${regex.source}/`);
                    }
                }

                // { $contains: "string" }
                if ('$contains' in expected) {
                    // Validate expected
                    if (typeof expected.$contains != 'string') {
                        throw new Error(`$contains has to be a string: ${JSON.stringify(expected.$contains)}`);
                    }

                    // Validate actual matches expected
                    if (typeof actual != 'string') {
                        errors.push(`isn't a string so can't $contains "${expected.$contains}"`);
                    }
                    else if (!actual.includes(expected.$contains)) {
                        errors.push(`doesn't $contains "${expected.$contains}"`);
                    }
                }

                // { $max: <number> }
                if ('$max' in expected) {
                    // Validate expected
                    if (typeof expected.$max != 'number') {
                        throw new Error(`$max has to be a number: ${JSON.stringify(expected.$max)}`);
                    }

                    // Validate actual matches expected
                    if (typeof actual != 'number') {
                        errors.push(`isn't a number so can't have a $max of ${expected.$max}`);
                    }
                    else if (actual > expected.$max) {
                        errors.push(`is greater than the $max of ${expected.$max}`);
                    }
                }

                // { $min: <number> }
                if ('$min' in expected) {
                    // Validate expected
                    if (typeof expected.$min !== 'number') {
                        throw new Error(`$min has to be a number: ${JSON.stringify(expected.$min)}`);
                    }

                    // Validate actual matches expected
                    if (typeof actual != 'number') {
                        errors.push(`isn't a number so can't have a $min of ${expected.$min}`);
                    }
                    else if (actual < expected.$min) {
                        errors.push(`is less than the $min of ${expected.$min}`);
                    }
                }

                // { $code: (actual)=>{ return true/false; } } or { $code: "...true/false" } or { $code: "...return true/false" }
                if ('$code' in expected) {
                    let success = true;

                    // Validate expected
                    if (typeof expected.$code === 'function') {
                        success = expected.$code(actual);
                    }
                    else if (typeof expected.$code === 'string') {
                        try {
                            success = eval(expected.$code);
                        }
                        catch (e) {
                            if (e instanceof Error && e.message === 'Illegal return statement') {
                                // The code has a return, so enclose it in a function and try again
                                success = eval(`(()=>{${expected.$code}})()`);
                            }
                            else {
                                throw e;
                            }
                        }
                    }
                    else {
                        throw new Error(`$code has to be a function or string: ${expected.$code}`);
                    }

                    // Validate actual matches expected
                    if (!success) {
                        errors.push(`failed the $code '${expected.$code.toString().replace(/\n/g, ' ')}'`);
                    }
                }

                // { $length: <number> }
                if ('$length' in expected) {
                    // Validate expected
                    if (typeof expected.$length !== 'number') {
                        throw new Error(`$length has to be a number: ${JSON.stringify(expected.$length)}`);
                    }

                    // Validate actual matches expected
                    if (typeof actual != 'object' && typeof actual != 'string') {
                        errors.push(`isn't an object, array, or string so can't have a $length of ${expected.$length}`);
                    }
                    else {
                        if (typeof actual === 'string' || (actual && 'length' in actual)) {
                            if (actual.length !== expected.$length) {
                                errors.push(`doesn't have a $length of ${expected.$length}`);
                            }
                        }
                        else {
                            errors.push(
                                `doesn't have a length property so can't have a $length of ${expected.$length}`
                            );
                        }
                    }
                }

                // { $maxLength: <number> }
                if ('$maxLength' in expected) {
                    // Validate expected
                    if (typeof expected.$maxLength !== 'number') {
                        throw new Error(`$maxLength has to be a number: ${JSON.stringify(expected.$maxLength)}`);
                    }

                    // Validate actual matches expected
                    if (typeof actual !== 'object' && typeof actual !== 'string') {
                        errors.push(
                            `isn't an object, array, or string so can't have a $maxLength of ${expected.$maxLength}`
                        );
                    }
                    else {
                        if (typeof actual === 'string' || (actual && 'length' in actual)) {
                            const length = actual.length;
                            if (typeof length === 'number' && length > expected.$maxLength) {
                                errors.push(`is longer than the $maxLength of ${expected.$maxLength}`);
                            }
                        }
                        else {
                            errors.push(
                                `doesn't have a length property so can't have a $maxLength of ${expected.$maxLength}`
                            );
                        }
                    }
                }

                // { $minLength: <number> }
                if ('$minLength' in expected) {
                    // Validate expected
                    if (typeof expected.$minLength !== 'number') {
                        throw new Error(`$minLength has to be a number: ${JSON.stringify(expected.$minLength)}`);
                    }

                    // Validate actual matches expected
                    if (typeof actual !== 'object' && typeof actual !== 'string') {
                        errors.push(
                            `isn't an object, array, or string so can't have a $minLength of ${expected.$minLength}`
                        );
                    }
                    else {
                        if (typeof actual === 'string' || (actual && 'length' in actual)) {
                            const length = actual.length;
                            if (typeof length === 'number' && length < expected.$minLength) {
                                errors.push(`is shorter than the $minLength of ${expected.$minLength}`);
                            }
                        }
                        else {
                            errors.push(
                                `doesn't have a length property so can't have a $minLength of ${expected.$minLength}`
                            );
                        }
                    }
                }

                // { $every: <value> }
                if ('$every' in expected) {
                    // Validate actual matches expected
                    if (typeof actual != 'object' || !(actual instanceof Array)) {
                        errors.push('not an array as needed for $every');
                    }
                    else if (actual.length === 0) {
                        errors.push('empty array cannot match $every');
                    }
                    else {
                        for (let i = 0; i < actual.length; i++) {
                            actual[i] = this.comparison(actual[i], expected.$every, subsetMatching);
                        }
                    }
                }

                // { $exact: true }
                let exact = false;
                if ('$exact' in expected) {
                    exact = true;
                }

                // If there are non-$ keys in expected, then expected is a plain object that needs to be a subset of the actual object
                const expectedKeys = Object.keys(expected).filter(
                    (key) => !(RESERVED_KEYWORDS as string[]).includes(key)
                );
                if (exact || expectedKeys.length > 0) {
                    if (typeof actual !== 'object' || actual === null) {
                        errors.push('not an object');
                    }
                    else {
                        // Make sure every key in expected matches every key in actual
                        for (const key of expectedKeys) {
                            if (!actual || (!(key in actual) && Reflect.get(expected, key) !== undefined)) {
                                errors.push({
                                    blockError: true,
                                    text: 'missing',
                                    key,
                                    obj: Reflect.get(expected, key)
                                });
                            }
                            else {
                                Reflect.set(
                                    actual,
                                    key,
                                    this.comparison(
                                        Reflect.get(actual, key),
                                        Reflect.get(expected, key),
                                        subsetMatching
                                    )
                                );
                            }
                        }

                        if (exact) {
                            // Make sure every key in actual exists in expected
                            for (const key in actual) {
                                if (Object.prototype.hasOwnProperty.call(actual, key)) {
                                    if (!Object.prototype.hasOwnProperty.call(expected, key)) {
                                        Reflect.set(
                                            actual,
                                            key,
                                            this.createComparerNode(
                                                ['this key isn\'t in $exact object'],
                                                Reflect.get(actual, key)
                                            )
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        else {
            // expected is a primitive (also handles functions, undefineds, and other constructs whose typeof isn't object)
            if (actual !== expected) {
                errors.push(`not ${JSON.stringify(expected)}`);
            }
        }

        return this.createComparerNode(errors, originalActual);
    }

    /**
     * Creates a new ComparerNode
     * @param {Array} errors - An array of strings describing the errors
     * @param {Anything} value - The value that will be replaced with the new ComparerNode
     * @return {ComparerNode} The ComparerNode that destination will be set to
     */
    static createComparerNode(errors: ElementFinderError[], value: unknown) {
        if (value instanceof ComparerNode) {
            return new ComparerNode(value.errors.concat(errors), value.value);
        }
        else {
            return new ComparerNode(errors, value);
        }
    }

    /**
     * @param {Anything} value - Something that came out of comparison() (a plain object, array, primitive, or ComparerNode object)
     * @param {Boolean} [isRecursive] - If true, this is a recursive call from within hasErrors()
     * @return {Boolean} True if value has errors in it, false otherwise
     */
    static hasErrors(value: unknown, isRecursive?: boolean) {
        // Do not traverse value if it's been seen already (in the case of object with circular references)
        if (this.wasSeen(value)) return false;

        if (value instanceof ComparerNode) {
            if (value.errors.length > 0) {
                this.endSeen(!isRecursive);
                return true;
            }
            value = value.value;
            if (this.wasSeen(value)) return false;
        }

        if (typeof value === 'object') {
            if (value === null) {
                this.endSeen(!isRecursive);
                return false;
            }
            else if (value instanceof Array) {
                for (const item of value) {
                    if (this.hasErrors(item, true)) {
                        this.endSeen(!isRecursive);
                        return true;
                    }
                }
            }
            else {
                // plain object
                for (const key in value) {
                    if (Object.prototype.hasOwnProperty.call(value, key)) {
                        if (this.hasErrors(Reflect.get(value, key), true)) {
                            this.endSeen(!isRecursive);
                            return true;
                        }
                    }
                }
            }
        }

        this.endSeen(!isRecursive);
        return false;
    }

    /**
     * Ends maintaining a list of seen objects (used to prevent infinite loops on circular objects). Only works if go is true.
     */
    static endSeen(go: boolean) {
        if (go) {
            delete Comparer.seen;
        }
    }

    /**
     * @return {Boolean} True if the given value was seen already, false otherwise
     */
    static wasSeen(value: unknown) {
        if (!Comparer.seen) {
            Comparer.seen = [];
        }

        if (typeof value === 'object' && value !== null) {
            for (let i = 0; i < Comparer.seen.length; i++) {
                if (Comparer.seen[i] === value) {
                    return true;
                }
            }
            Comparer.seen.push(value);
        }

        return false;
    }

    /**
     * @param {Anything} value - Something that came out of comparison() (a plain object, array, primitive, or ComparerNode object)
     * @param {String} [errorStart] - String to mark the start of an error, '-->' if omitted
     * @param {String} [errorEnd] - String to mark the end of an error, '' if omitted
     * @param {Number} [indents] - The number of indents at this value, 0 if omitted
     * @param {Boolean} [commaAtEnd] - If true, put a comma at the end of the printed value
     * @return {String} The pretty-printed version of value, including errors
     */
    static print(value: unknown, errorStart?: string, errorEnd?: string, indents?: number, commaAtEnd?: boolean) {
        if (indents === undefined) {
            indents = 0;
        }

        if (errorStart === undefined) {
            errorStart = '-->';
        }
        if (errorEnd === undefined) {
            errorEnd = '';
        }

        if (this.wasSeen(value)) return '[Circular]\n';

        const spaces = utils.getIndentWhitespace(indents);
        const nextSpaces = utils.getIndentWhitespace(indents + 1);
        let ret = '';

        // let errors: (BlockError & string)[] = [];
        let errors: ElementFinderError[] = [];

        if (value instanceof ComparerNode) {
            errors = value.errors;
            value = value.value;
        }

        if (typeof value === 'object') {
            if (value === null) {
                // remember, typeof null is "object"
                ret += 'null' + (commaAtEnd ? ',' : '') + outputErrors() + '\n';
            }
            else if (Array.isArray(value)) {
                ret += '[' + outputErrors() + '\n';
                for (let i = 0; i < value.length; i++) {
                    ret +=
                        nextSpaces + Comparer.print(value[i], errorStart, errorEnd, indents + 1, i < value.length - 1);
                }

                ret += outputBlockErrors();

                ret += spaces + ']' + (commaAtEnd ? ',' : '') + '\n';
            }
            else {
                // plain object
                ret += '{' + outputErrors() + '\n';
                const keys = Object.keys(value);
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];
                    if (Object.prototype.hasOwnProperty.call(value, key)) {
                        const hasWeirdChars = key.match(/[^A-Za-z0-9$]/); // put quotes around the key if there are non-standard chars in it
                        ret +=
                            nextSpaces +
                            (hasWeirdChars ? '"' : '') +
                            key +
                            (hasWeirdChars ? '"' : '') +
                            ': ' +
                            Comparer.print(
                                Reflect.get(value, key),
                                errorStart,
                                errorEnd,
                                indents + 1,
                                i < keys.length - 1
                            );
                    }
                }

                ret += outputBlockErrors();

                ret += spaces + '}' + (commaAtEnd ? ',' : '') + '\n';
            }
        }
        else {
            // primitive
            if (typeof value === 'function') {
                value = '[Function]';
            }
            else {
                value = JSON.stringify(value);
            }

            ret = value + (commaAtEnd ? ',' : '') + outputErrors() + '\n';
        }

        if (indents == 0) {
            this.endSeen(true);
            return ret.trim();
        }
        else {
            return ret;
        }

        /**
         * @return {String} Stringified normal errors, generated from the errors array
         */
        function outputErrors() {
            const filteredErrors = errors.filter((error) => !error.blockError);

            if (filteredErrors.length == 0) {
                return '';
            }

            let ret = `  ${errorStart}  `;
            for (const error of errors) {
                invariant(typeof error === 'string', 'Error should be a string here');
                ret += error.replace(/\n/g, ' ') + ', ';
            }

            ret = ret.slice(0, -2); // slice off last ', '
            ret += errorEnd;

            return ret;
        }

        /**
         * @return {String} Stringified block errors, generated from the errors array
         */
        function outputBlockErrors() {
            const filteredErrors = errors.filter((error) => error.blockError);

            if (filteredErrors.length == 0) {
                return '';
            }

            let ret = '\n';
            for (const error of errors) {
                invariant(error.blockError, '\'error\' should be a block error here');

                ret += nextSpaces + `${errorStart} ${error.text}\n`;
                ret +=
                    nextSpaces +
                    (error.key ? error.key + ': ' : '') +
                    Comparer.print(error.obj, errorStart, errorEnd, indents === undefined ? undefined : indents + 1) +
                    errorEnd +
                    '\n';
            }

            ret = ret.slice(0, -1); // slice off last '\n'

            return ret;
        }
    }

    /**
     * @param {Anything} value - Any value
     * @param {Boolean} [jsonClone] - If true, compares using the json clone method (throws error if there's a circular reference in value)
     * @return A clone of the given value
     * NOTE: In non-json-clone, if there are multiple references to a shared object in value, that object will be shared in the clone as well
     */
    static clone<T>(value: T, jsonClone?: boolean): T {
        return jsonClone ? this.jsonClone(value) : cloneDeep(value);
    }

    /**
     * @param {Anything} value - Any value
     * @return A clone of the given value
     * When there are multiple references to a shared object within value, they will be separate objects in the clone
     * An object value that's undefined or a function will be removed. An array value that's undefined or a function will be convered to null.
     * Will throw an error if value contains a circular reference
     */
    static jsonClone<T>(value: T): T {
        return JSON.parse(JSON.stringify(value));
    }
}

export default Comparer;
