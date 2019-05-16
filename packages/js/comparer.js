const clonedeep = require('lodash/clonedeep');

const RESERVED_KEYWORDS = ['$typeof', '$regex', '$contains', '$max', '$min', '$code', '$length', '$maxLength', '$minLength', '$subset', '$anyOrder', '$exact', '$every'];
const DEBUG = false;

class Comparer {
    constructor() {
    }

    /**
     * Compares the actual object against the expected object
     * Usage: expect(actualObj).to.match(expectedObj)
     * @param {Object} actualObj - The object to check. Must not have circular references or multiple references to the same object inside. Could be an array.
     * @param {Object} expectedObj - The object specifying criteria for actualObj to match
     * @param {Boolean} [roughClone] - If true, compares using the rough clone method, aka JSON.stringify + JSON.parse (which handles multiple references to the same object inside actualObj, but also removes functions and undefineds, and converts them to null in arrays)
     * @throws {Error} If actualObj doesn't match expectedObj
     */
    static expect(actualObj, roughClone) {
        return {
            to: {
                match: (expectedObj) => {
                    actualObj = this.clone(actualObj, roughClone);
                    let comp = this.comparison(actualObj, expectedObj);
                    if(this.hasErrors(comp)) {
                        throw new Error('\n' + this.print(comp));
                    }
                }
            }
        }
    }

    /**
     * Compares the actual value against the expected value
     * Calls itself recursively on every object, array, and primitive inside of actual
     * Replaces every object, array, and primitive inside of actual with a special $comparerNode object. See return value for format.
     * @param {Anything} actual - The value to check (could be a plain object, array, or primitive)
     * @param {Anything} expected - Criteria for actual to match (could be a primitive, object, or array to match exactly or an object/array that specifies constraints)
     * @param {Boolean} [subsetMatching] - If true, all objects and arrays are matched by subset (not just objects, as is the default)
     * @return {Object} { errors: array of strings describing errors related to comparison, value: original actual value at this position, $comparerNode: true }
     */
    static comparison(actual, expected, subsetMatching) {
        let errors = [];

        let origActual = DEBUG && this.clone(actual);
        let origExpected = DEBUG && this.clone(expected);

        if(typeof expected == 'object') {
            if(expected === null) { // remember, typeof null is "object"
                if(actual !== null) {
                    errors.push(`not null`);
                }
            }
            else if(expected instanceof Array) {
                if(!(actual instanceof Array)) {
                    errors.push(`not an array`);
                }
                else {
                    let subset = false;
                    let anyOrder = false;

                    // [ '$subset', A, B, ... ]
                    if(expected.indexOf('$subset') != -1 || subsetMatching) {
                        subset = true;
                    }

                    // [ '$anyOrder', A, B, ... ]
                    if(expected.indexOf('$anyOrder') != -1) {
                        anyOrder = true;
                    }

                    // Make sure every expected item has a corresponding actual item
                    for(let expectedIndex = 0, actualIndex = 0; expectedIndex < expected.length; expectedIndex++) {
                        let expectedItem = expected[expectedIndex];
                        if(['$subset', '$anyOrder'].indexOf(expectedItem) == -1) {
                            if(anyOrder || subset) {
                                // corresponding actual item can be anywhere
                                let actualClone = this.clone(actual);
                                let found = false;
                                for(let i = 0; i < actualClone.length; i++) {
                                    let actualItem = actualClone[i];
                                    if(this.isComparerNode(actualItem)) {
                                        continue; // this item has been claimed already
                                    }

                                    let comparisonResult = this.comparison(actualItem, expectedItem, true);
                                    if(!this.hasErrors(comparisonResult)) {
                                        // we have a match
                                        found = true;
                                        actual[i] = comparisonResult;
                                        break;
                                    }
                                }

                                if(!found) {
                                    errors.push( { blockError: true, text: `missing`, obj: expectedItem } );
                                }
                            }
                            else {
                                // corresponding actual item has to be at the same index
                                actual[actualIndex] = this.comparison(actual[actualIndex], expected[expectedIndex], subsetMatching);
                            }

                            actualIndex++;
                        }
                    }

                    if(!subset) {
                        // Make sure we don't have any items in actual that haven't been visited
                        for(let i = 0; i < actual.length; i++) {
                            if(!this.isComparerNode(actual[i])) {
                                actual[i] = { errors: [ `not expected` ], value: actual[i], $comparerNode: true };
                            }
                        }
                    }
                }
            }
            else { // expected is a plain object
                // { $typeof: "type" }
                if(expected.hasOwnProperty("$typeof")) {
                    // Validate expected
                    if(typeof expected.$typeof != 'string') {
                        throw new Error(`$typeof has to be a string: ${expected.$typeof}`);
                    }

                    // Validate actual matches expected
                    if(expected.$typeof.toLowerCase() == 'array') {
                        if(!(actual instanceof Array)) {
                            errors.push(`not $typeof array`);
                        }
                    }
                    else if(typeof actual != expected.$typeof) {
                        errors.push(`not $typeof ${expected.$typeof}`);
                    }
                }

                // { $regex: /regex/ } or { $regex: "regex" }
                if(expected.hasOwnProperty("$regex")) {
                    // Validate expected
                    let regex = null;
                    if(typeof expected.$regex == 'string') {
                        regex = new RegExp(expected.$regex);
                    }
                    else if(expected.$regex instanceof RegExp) {
                        regex = expected.$regex;
                    }
                    else {
                        throw new Error(`$regex has to be a /regex/ or "regex": ${expected.$regex}`);
                    }

                    // Validate actual matches expected
                    if(typeof actual != 'string') {
                        errors.push(`isn't a string so can't match $regex /${regex.source}/`);
                    }
                    else if(!actual.match(regex)) {
                        errors.push(`doesn't match $regex /${regex.source}/`);
                    }
                }

                // { $contains: "string" }
                if(expected.hasOwnProperty("$contains")) {
                    // Validate expected
                    if(typeof expected.$contains != 'string') {
                        throw new Error(`$contains has to be a string: ${JSON.stringify(expected.$contains)}`);
                    }

                    // Validate actual matches expected
                    if(typeof actual != 'string') {
                        errors.push(`isn't a string so can't $contains "${expected.$contains}"`);
                    }
                    else if(!actual.includes(expected.$contains)) {
                        errors.push(`doesn't $contains "${expected.$contains}"`);
                    }
                }

                // { $max: <number> }
                if(expected.hasOwnProperty("$max")) {
                    // Validate expected
                    if(typeof expected.$max != 'number') {
                        throw new Error(`$max has to be a number: ${JSON.stringify(expected.$max)}`);
                    }

                    // Validate actual matches expected
                    if(typeof actual != 'number') {
                        errors.push(`isn't a number so can't have a $max of ${expected.$max}`);
                    }
                    else if(actual > expected.$max) {
                        errors.push(`is greater than the $max of ${expected.$max}`);
                    }
                }

                // { $min: <number> }
                if(expected.hasOwnProperty("$min")) {
                    // Validate expected
                    if(typeof expected.$min != 'number') {
                        throw new Error(`$min has to be a number: ${JSON.stringify(expected.$min)}`);
                    }

                    // Validate actual matches expected
                    if(typeof actual != 'number') {
                        errors.push(`isn't a number so can't have a $min of ${expected.$min}`);
                    }
                    else if(actual < expected.$min) {
                        errors.push(`is less than the $min of ${expected.$min}`);
                    }
                }

                // { $code: (actual)=>{ return true/false; } } or { $code: "...true/false" } or { $code: "...return true/false" }
                if(expected.hasOwnProperty("$code")) {
                    let success = true;

                    // Validate expected
                    if(typeof expected.$code == 'function') {
                        success = expected.$code(actual);
                    }
                    else if(typeof expected.$code == 'string') {
                        try {
                            success = eval(expected.$code);
                        }
                        catch(e) {
                            if(e.message == "Illegal return statement") {
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
                    if(!success) {
                        errors.push(`failed the $code '${expected.$code.toString().replace(/\n/g, ' ')}'`);
                    }
                }

                // { $length: <number> }
                if(expected.hasOwnProperty("$length")) {
                    // Validate expected
                    if(typeof expected.$length != 'number') {
                        throw new Error(`$length has to be a number: ${JSON.stringify(expected.$length)}`);
                    }

                    // Validate actual matches expected
                    if(typeof actual != 'object' && typeof actual != 'string') {
                        errors.push(`isn't an object, array, or string so can't have a $length of ${expected.$length}`);
                    }
                    else {
                        if(actual.hasOwnProperty('length')) {
                            if(actual.length != expected.$length) {
                                errors.push(`doesn't have a $length of ${expected.$length}`);
                            }
                        }
                        else {
                            errors.push(`doesn't have a length property so can't have a $length of ${expected.$length}`);
                        }
                    }
                }

                // { $maxLength: <number> }
                if(expected.hasOwnProperty("$maxLength")) {
                    // Validate expected
                    if(typeof expected.$maxLength != 'number') {
                        throw new Error(`$maxLength has to be a number: ${JSON.stringify(expected.$maxLength)}`);
                    }

                    // Validate actual matches expected
                    if(typeof actual != 'object' && typeof actual != 'string') {
                        errors.push(`isn't an object, array, or string so can't have a $maxLength of ${expected.$maxLength}`);
                    }
                    else {
                        if(actual.hasOwnProperty('length')) {
                            if(actual.length > expected.$maxLength) {
                                errors.push(`is longer than the $maxLength of ${expected.$maxLength}`);
                            }
                        }
                        else {
                            errors.push(`doesn't have a length property so can't have a $maxLength of ${expected.$maxLength}`);
                        }
                    }
                }

                // { $minLength: <number> }
                if(expected.hasOwnProperty("$minLength")) {
                    // Validate expected
                    if(typeof expected.$minLength != 'number') {
                        throw new Error(`$minLength has to be a number: ${JSON.stringify(expected.$minLength)}`);
                    }

                    // Validate actual matches expected
                    if(typeof actual != 'object' && typeof actual != 'string') {
                        errors.push(`isn't an object, array, or string so can't have a $minLength of ${expected.$minLength}`);
                    }
                    else {
                        if(actual.hasOwnProperty('length')) {
                            if(actual.length < expected.$minLength) {
                                errors.push(`is shorter than the $minLength of ${expected.$minLength}`);
                            }
                        }
                        else {
                            errors.push(`doesn't have a length property so can't have a $minLength of ${expected.$minLength}`);
                        }
                    }
                }

                // { $every: <value> }
                if(expected.hasOwnProperty("$every")) {
                    // Validate actual matches expected
                    if(typeof actual != 'object' || !(actual instanceof Array)) {
                        errors.push(`not an array as needed for $every`);
                    }
                    else if(actual.length == 0) {
                        errors.push(`empty array cannot match $every`);
                    }
                    else {
                        for(let i = 0; i < actual.length; i++) {
                            actual[i] = this.comparison(actual[i], expected.$every, subsetMatching);
                        }
                    }
                }

                // { $exact: true }
                let exact = false;
                if(expected.hasOwnProperty("$exact")) {
                    exact = true;
                }

                // If there are non-$ keys in expected, then expected is a plain object that needs to be a subset of the actual object
                let expectedKeys = Object.keys(expected).filter(key => RESERVED_KEYWORDS.indexOf(key) == -1);
                if(exact || expectedKeys.length > 0) {
                    if(typeof actual != 'object') {
                        errors.push(`not an object`);
                    }
                    else {
                        // Make sure every key in expected matches every key in actual
                        for(let key of expectedKeys) {
                            if(!actual || (!actual.hasOwnProperty(key) && expected[key] !== undefined)) {
                                errors.push( { blockError: true, text: `missing`, key: key, obj: expected[key] } );
                            }
                            else if(!this.isComparerNode(actual[key])) { // skip over keys in actual already "visited"
                                actual[key] = this.comparison(actual[key], expected[key], subsetMatching);
                            }
                        }

                        if(exact) {
                            // Make sure every key in actual exists in expected
                            for(let key in actual) {
                                if(actual.hasOwnProperty(key)) {
                                    if(!expected.hasOwnProperty(key)) {
                                        actual[key] = { errors: [ `this key isn't in $exact object` ], value: actual[key], $comparerNode: true };
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        else { // expected is a primitive (also handles functions, undefineds, and other constructs whose typeof isn't object)
            if(actual !== expected || (actual && actual.$undefined && expected !== undefined)) {
                errors.push(`not ${JSON.stringify(expected)}`);
            }
        }

        let ret = { errors: errors, value: actual, $comparerNode: true };

        if(DEBUG) {
            console.log("----------");
            console.log("ACTUAL:");
            console.log(origActual);
            console.log("EXPECTED:")
            console.log(origExpected);
            console.log("RETURN");
            console.log(ret);
        }

        return ret;
    }

    /**
     * @param {Anything} value - Something that came out of comparison() (a plain object, array, primitive, or $comparerNode object)
     * @param {Boolean} [isRecursive] - If true, this is a recursive call from within hasErrors()
     * @return {Boolean} True if value has errors in it, false otherwise
     */
    static hasErrors(value, isRecursive) {
        // Do not traverse value if it's been seen already (in the case of object with circular references)
        createSeen();
        if(typeof value == 'object') {
            for(let i = 0; i < Comparer.seen.length; i++) {
                if(Comparer.seen[i] === value) {
                    return;
                }
            }
            Comparer.seen.push(value);
        }

        if(this.isComparerNode(value)) {
            if(value.errors.length > 0) {
                removeSeen();
                return true;
            }

            value = value.value;
        }

        if(typeof value == 'object') {
            if(value === null) {
                removeSeen();
                return false;
            }
            else if(value instanceof Array) {
                for(let item of value) {
                    if(this.hasErrors(item, true)) {
                        removeSeen();
                        return true;
                    }
                }
            }
            else { // plain object
                for(let key in value) {
                    if(value.hasOwnProperty(key)) {
                        if(this.hasErrors(value[key], true)) {
                            removeSeen();
                            return true;
                        }
                    }
                }
            }
        }

        removeSeen();
        return false;

        function createSeen() {
            if(!isRecursive) {
                Comparer.seen = [];
            }
        }

        function removeSeen() {
            if(!isRecursive) {
                delete Comparer.seen;
            }
        }
    }

    /**
     * @return {Boolean} True if the given value is an object with $comparerNode set, false otherwise
     */
    static isComparerNode(value) {
        return typeof value == 'object' && value !== null && value.$comparerNode;
    }

    /**
     * @param {Anything} value - Something that came out of comparison() (a plain object, array, primitive, or $comparerNode object)
     * @param {Number} [indents] - The number of indents at this value, 0 if omitted
     * @param {Boolean} [commaAtEnd] - If true, put a comma at the end of the printed value
     * @return {String} The pretty-printed version of value, including errors
     */
    static print(value, indents, commaAtEnd) {
        if(!indents) {
            indents = 0;
        }

        let spaces = outputIndents(indents);
        let nextSpaces = outputIndents(indents + 1);
        let ret = '';
        let self = this;

        let errors = [];
        if(this.isComparerNode(value)) {
            errors = value.errors;
            value = value.value;
        }

        if(typeof value == 'object') {
            if(value === null) { // remember, typeof null is "object"
                ret += 'null' + (commaAtEnd ? ',' : '') + outputErrors() + '\n';
            }
            else if(value instanceof Array) {
                ret += '[' + outputErrors() + '\n';
                for(let i = 0; i < value.length; i++) {
                    ret += nextSpaces + this.print(value[i], indents + 1, i < value.length - 1);
                }

                ret += outputBlockErrors();

                ret += spaces + ']' + (commaAtEnd ? ',' : '') + '\n';
            }
            else { // plain object
                ret += '{' + outputErrors() + '\n';
                let keys = Object.keys(value);
                for(let i = 0; i < keys.length; i++) {
                    let key = keys[i];
                    if(value.hasOwnProperty(key)) {
                        let hasWeirdChars = key.match(/[^A-Za-z0-9\$]/); // put quotes around the key if there are non-standard chars in it
                        ret += nextSpaces + (hasWeirdChars ? '"' : '') + key + (hasWeirdChars ? '"' : '') + ': ' + this.print(value[key], indents + 1, i < keys.length - 1);
                    }
                }

                ret += outputBlockErrors();

                ret += spaces + '}' + (commaAtEnd ? ',' : '') + '\n';
            }
        }
        else { // primitive
            if(typeof value == 'function') {
                value = '[Function]';
            }
            else {
                value = JSON.stringify(value);
            }

            ret = value + (commaAtEnd ? ',' : '') + outputErrors() + '\n';
        }

        if(indents == 0) {
            return ret.trim();
        }
        else {
            return ret;
        }

        /**
         * @return {String} A string with the given number of indents, in spaces
         */
        function outputIndents(num) {
            const SPACES_PER_INDENT = 4;
            let spaces = '';
            for(let i = 0; i < num * SPACES_PER_INDENT; i++) {
                spaces += ' ';
            }
            return spaces;
        }

        /**
         * @return {String} Stringified normal errors, generated from the errors array
         */
        function outputErrors() {
            let filteredErrors = errors.filter(error => !error.blockError);

            if(filteredErrors.length == 0) {
                return '';
            }

            let ret = '  -->  ';
            for(let error of errors) {
                ret += error.replace(/\n/g, ' ') + ', ';
            }

            // Slice off last ', '
            ret = ret.slice(0, -2);

            return ret;
        }

        /**
         * @return {String} Stringified block errors, generated from the errors array
         */
        function outputBlockErrors() {
            let filteredErrors = errors.filter(error => error.blockError);

            if(filteredErrors.length == 0) {
                return '';
            }

            let ret = '\n';
            for(let error of errors) {
                ret += nextSpaces + '--> ' + error.text + '\n';
                ret += nextSpaces + (error.key ? error.key + ': ' : '') + self.print(error.obj, indents + 1) + '\n';
            }

            // Slice off last '\n'
            ret = ret.slice(0, -1);

            return ret;
        }
    }

    /**
     * @param {Anything} value - Any value
     * @param {Boolean} [roughClone] - If true, compares using the rough clone method
     * @return A clone of the given value
     * NOTE: when there are multiple references to the same object within value, that will be retained in the clone
     */
    static clone(value, roughClone) {
        return roughClone ? this.roughClone(value) : clonedeep(value);
    }

    /**
     * @param {Anything} value - Any value
     * @return A clone of the given value
     * NOTE: When there are multiple references to the same object within value, they will be separate objects in the clone
     * NOTE: An undefined value or function will be removed
     */
    static roughClone(value) {
        return JSON.parse(JSON.stringify(value));
    }
}
module.exports = Comparer;
