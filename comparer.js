const clonedeep = require('lodash/clonedeep');

class Comparer {
    constructor() {
    }

    /**
     * Compares the actual value against the expected value
     * Calls itself recursively on every object, array, and primitive inside of actual
     * Replaces every object, array, and primitive inside of actual with a special $comparerNode object. See return value for format.
     * @param {Anything} actual - The value to check (could be a plain object, array, or primitive)
     * @param {Anything} expected - Criteria for actual to match (could be a primitive, object, or array to match exactly or an object/array that specifies constraints)
     * @return {Object} { errors: array of strings describing errors related to comparison, value: original actual value at this position, $comparerNode: true }
     */
    static comparison(actual, expected) {
        let errors = [];

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
                    // [ '$every', A ]
                    if(expected.indexOf('$every') == 0) {
                        // Validate expected
                        if(expected.length != 2) {
                            throw new Error(`an $every array must have exactly 2 items: ${JSON.stringify(expected)}`);
                        }

                        // Validate actual matches expected
                        for(let i = 0; i < actual.length; i++) {
                            actual[i] = this.comparison(actual[i], expected[1]);
                        }
                    }
                    else {
                        let subset = false;
                        let anyOrder = false;

                        // [ '$subset', A, B, ... ]
                        if(expected.indexOf('$subset') != -1) {
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
                                if(anyOrder) {
                                    // corresponding actual item can be anywhere
                                    let actualClone = clonedeep(actual);
                                    let found = false;
                                    for(let i = 0; i < actualClone.length; i++) {
                                        let actualItem = actualClone[i];
                                        let comparisonResult = this.comparison(actualItem, expectedItem);
                                        if(!this.hasErrors(comparisonResult)) {
                                            // we have a match
                                            found = true;
                                            actual[i] = comparisonResult;
                                            break;
                                        }
                                    }

                                    if(!found) {
                                        errors.push(`couldn't find ${JSON.stringify(expectedItem)} here`);
                                    }
                                }
                                else {
                                    // corresponding actual item has to be at the same index
                                    actual[actualIndex] = this.comparison(actual[actualIndex], expected[expectedIndex]);
                                }

                                actualIndex++;
                            }
                        }

                        if(!subset) {
                            // Make sure we don't have any items in actual that haven't been visited
                            for(let i = 0; i < actual.length; i++) {
                                if(typeof actual[i] != 'object' || !actual[i] || !actual[i].hasOwnProperty('$comparerNode')) {
                                    actual[i] = { errors: [ `not expected` ], value: actual[i], $comparerNode: true };
                                }
                            }
                        }
                    }
                }
            }
            else { // expected is a plain object
                let actualExpectedToBePlainObject = true;

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

                    actualExpectedToBePlainObject = false;
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

                    actualExpectedToBePlainObject = false;
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

                    actualExpectedToBePlainObject = false;
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

                    actualExpectedToBePlainObject = false;
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

                    actualExpectedToBePlainObject = false;
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
                        errors.push(`failed the $code '${expected.$code.toString()}'`);
                    }

                    actualExpectedToBePlainObject = false;
                }

                // { $length: <number> }
                if(expected.hasOwnProperty("$length")) {
                    // Validate expected
                    if(typeof expected.$length != 'number') {
                        throw new Error(`$length has to be a number: ${expected.$length}`);
                    }

                    // Validate actual matches expected
                    if(typeof actual != 'object') {
                        errors.push(`isn't an object or array so can't have a $length of ${expected.$length}`);
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

                    actualExpectedToBePlainObject = false;
                }

                // { $maxLength: <number> }
                if(expected.hasOwnProperty("$maxLength")) {
                    // Validate expected
                    if(typeof expected.$maxLength != 'number') {
                        throw new Error(`$maxLength has to be a number: ${expected.$maxLength}`);
                    }

                    // Validate actual matches expected
                    if(typeof actual != 'object') {
                        errors.push(`isn't an object or array so can't have a $maxLength of ${expected.$maxLength}`);
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

                    actualExpectedToBePlainObject = false;
                }

                // { $minLength: <number> }
                if(expected.hasOwnProperty("$minLength")) {
                    // Validate expected
                    if(typeof expected.$minLength != 'number') {
                        throw new Error(`$minLength has to be a number: ${expected.$minLength}`);
                    }

                    if(typeof actual != 'object') {
                        errors.push(`isn't an object or array so can't have a $minLength of ${expected.$minLength}`);
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

                    actualExpectedToBePlainObject = false;
                }

                // { $exact: true }
                if(expected.hasOwnProperty("$exact")) {
                    if(typeof actual != 'object') {
                        errors.push(`not an object as needed for $exact`);
                    }
                    else {
                        // Make sure every key in expected exists in actual
                        for(let key in expected) {
                            if(expected.hasOwnProperty(key) && !key.startsWith('$')) {
                                if(!actual.hasOwnProperty(key)) {
                                    errors.push(`missing key '${key}'`);
                                }
                                else {
                                    actual[key] = this.comparison(actual[key], expected[key]);
                                }
                            }
                        }

                        // Make sure every key in actual exists in expected
                        for(let key in actual) {
                            if(actual.hasOwnProperty(key)) {
                                if(!expected.hasOwnProperty(key)) {
                                    actual[key] = { errors: [ `this key isn't in $exact object` ], value: actual[key], $comparerNode: true };
                                }
                            }
                        }
                    }

                    actualExpectedToBePlainObject = false;
                }

                // expected is a plain object that needs to be a subset of the actual object
                if(actualExpectedToBePlainObject) {
                    if(typeof actual != 'object') {
                        errors.push(`not an object`);
                    }
                    else {
                        // Make sure every key in expected matches every key in actual
                        for(let key in expected) {
                            if(expected.hasOwnProperty(key)) {
                                if(!actual.hasOwnProperty(key)) {
                                    errors.push(`missing key '${key}'`);
                                }
                                else {
                                    actual[key] = this.comparison(actual[key], expected[key]);
                                }
                            }
                        }
                    }
                }
            }
        }
        else { // expected is a primitive (also handles functions, undefineds, and other constructs whose typeof isn't object)
            if(actual !== expected) {
                errors.push(`not ${JSON.stringify(expected)}`);
            }
        }

        return { errors: errors, value: actual, $comparerNode: true };
    }

    /**
     * Compares the actual object against the expected object
     * @param {Object} actualObj - The object to check. Must not have circular references. Could be an array.
     * @param {Object} expectedObj - The object specifying criteria for actualObj to match
     * @throws {Error} If actualObj doesn't match expectedObj
     */
    static compareObj(actualObj, expectedObj) {
        actualObj = clonedeep(actualObj);
        let comp = this.comparison(actualObj, expectedObj);
        if(this.hasErrors(comp)) {
            throw new Error(print(comp));
        }
    }

    /**
     * Same as compareObj(), but takes in json instead of an object
     */
    static compareJson(actualJson, expectedObj) {
        let actualObj = JSON.parse(actualJson);
        this.matchObj(actualObj, expectedObj);
    }

    /**
     * @param {Anything} value - Something that came out of comparison() (a plain object, array, primitive, or $comparerNode object)
     * @return {Boolean} True if value has errors in it, false otherwise
     */
    static hasErrors(value) {
        if(value.$comparerNode) {
            if(value.errors.length > 0) {
                return true;
            }
            else {
                if(typeof value.value == 'object') {
                    if(value.value instanceof Array) {
                        for(let item of value.value) {
                            if(this.hasErrors(item)) {
                                return true;
                            }
                        }
                    }
                    else { // plain object
                        for(let key in value.value) {
                            if(value.value.hasOwnProperty(key)) {
                                if(this.hasErrors(value.value[key])) {
                                    return true;
                                }
                            }
                        }
                    }
                }
                else { // primitive
                    return false;
                }
            }
        }

        return false;
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

        let errors = [];
        if(typeof value == 'object' && value !== null && value.$comparerNode) {
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

                ret += spaces + ']' + (commaAtEnd ? ',' : '') + '\n';
            }
            else { // plain object
                ret += '{' + outputErrors() + '\n';
                let keys = Object.keys(value);
                for(let i = 0; i < keys.length; i++) {
                    let key = keys[i];
                    if(value.hasOwnProperty(key)) {
                        let hasWeirdChars = key.match(/[^A-Za-z0-9]/); // put quotes around the key if there are non-standard chars in it
                        ret += nextSpaces + (hasWeirdChars ? '"' : '') + key + (hasWeirdChars ? '"' : '') + ': ' + this.print(value[key], indents + 1, i < keys.length - 1);
                    }
                }

                ret += spaces + '}' + (commaAtEnd ? ',' : '') + '\n';
            }
        }
        else { // primitive
            ret = JSON.stringify(value) + (commaAtEnd ? ',' : '') + outputErrors() + '\n';
        }

        if(indents == 0) {
            return ret.trim();
        }
        else {
            return ret;
        }

        function outputIndents(num) {
            const SPACES_PER_INDENT = 4;
            let spaces = '';
            for(let i = 0; i < num * SPACES_PER_INDENT; i++) {
                spaces += ' ';
            }
            return spaces;
        }

        function outputErrors() {
            if(!errors || errors.length == 0) {
                return '';
            }

            const MAX_ERROR_LEN = 50;

            let ret = '  -->  ';
            for(let error of errors) {
                let overLength = error.length > MAX_ERROR_LEN;
                ret += error.replace(/\n/g, ' ').slice(0, MAX_ERROR_LEN) + (overLength ? '...' : '') + ', ';
            }

            // Slice off last ', '
            ret = ret.slice(0, -2);

            return ret;
        }
    }

}
module.exports = Comparer;
