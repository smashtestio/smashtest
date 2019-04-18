const clonedeep = require('lodash/clonedeep');

class Comparer {
    constructor() {
    }

    /**
     * Tries to match the given value against the given criteria
     * Calls itself recursively on every object and array inside of value
     * Replaces every node with { errors, original value } (see return value)
     * @param {Anything} value - The value to check
     * @param {Anything} criteria - Criteria for the value to match (could be a primitive, object, array, etc. to match exactly or an object/array that specifies constraints)
     * @return {Object} - { errors: array of errors related to comparion, value: original value of obj }
     */
    static comparison(value, criteria) {
        let errors = [];

        if(typeof criteria == 'object') {
            if(criteria instanceof Array) {
                let valueExpectedToBePlainArray = true;

                // [ '$subset', A, B, ... ] (note that $subset and $anyOrder can exist in the same array)
                if(criteria.indexOf('$subset') != -1) {











                    valueExpectedToBePlainArray = false;
                }

                // [ '$anyOrder', A, B, ... ] (note that $subset and $anyOrder can exist in the same array)
                if(criteria.indexOf('$anyOrder') != -1) {








                    valueExpectedToBePlainArray = false;
                }

                // [ '$every', A ]
                if(criteria.indexOf('$every') == 0) {










                    valueExpectedToBePlainArray = false;
                }

                // criteria is a plain array that needs to match the value array index for index
                if(valueExpectedToBePlainArray) {
                    if(!(value instanceof Array)) {
                        errors.push(`not an array`);
                    }
                    else if(criteria.length != value.length) {
                        errors.push(`expected length of ${criteria.length}`);
                    }
                    else {
                        for(let i = 0; i < criteria.length - 1; i++) {
                            value[i] = this.comparison(value[i], criteria[i]);
                        }
                    }
                }
            }
            else { // criteria is a plain object
                let valueExpectedToBePlainObject = true;

                // { $typeof: "type" }
                if(criteria.$typeof) {
                    // Validate criteria
                    if(typeof criteria.$typeof != 'string') {
                        throw new Error(`$typeof has to be a string: ${criteria.$typeof}`);
                    }

                    // Validate value matches criteria
                    if(criteria.$typeof.toLowerCase() == 'array') {
                        if(!(value instanceof Array)) {
                            errors.push(`not an array`);
                        }
                    }
                    else if(typeof value != criteria.$typeof) {
                        errors.push(`doesn't have $typeof ${criteria.$typeof}`);
                    }

                    valueExpectedToBePlainObject = false;
                }

                // { $regex: /regex/ } or { $regex: "regex" }
                if(criteria.$regex) {
                    // Validate criteria
                    let regex = null;
                    if(typeof criteria.$regex == 'string') {
                        regex = new RegExp(criteria.$regex);
                    }
                    else if(criteria.$regex instanceof RegExp) {
                        regex = criteria.$regex;
                    }
                    else {
                        throw new Error(`$regex has to be a /regex/ or string: ${criteria.$regex}`);
                    }

                    // Validate value matches criteria
                    if(typeof value != 'string') {
                        errors.push(`isn't a string so can't match $regex /${regex.source}/`);
                    }
                    else if(!value.match(criteria.$regex)) {
                        errors.push(`doesn't match $regex /${regex.source}/`);
                    }

                    valueExpectedToBePlainObject = false;
                }

                // { $contains: "string" }
                if(criteria.$contains) {
                    // Validate criteria
                    if(typeof criteria.$contains != 'string') {
                        throw new Error(`$contains has to be a string: ${criteria.$contains}`);
                    }

                    // Validate value matches criteria
                    if(typeof value != 'string') {
                        errors.push(`isn't a string so can't $contains '${criteria.$contains}'`);
                    }
                    else if(!value.contains(criteria.$contains)) {
                        errors.push(`doesn't $contains '${criteria.$contains}'`);
                    }

                    valueExpectedToBePlainObject = false;
                }

                // { $max: <number> }
                if(criteria.$max) {
                    // Validate criteria
                    if(typeof criteria.$max != 'number') {
                        throw new Error(`$max has to be a number: ${criteria.$max}`);
                    }

                    // Validate value matches criteria
                    if(typeof value != 'number') {
                        errors.push(`isn't a number so can't be at a $max of ${criteria.$max}`);
                    }
                    else if(value > criteria.$max) {
                        errors.push(`is greater than the $max of ${criteria.$max}`);
                    }

                    valueExpectedToBePlainObject = false;
                }

                // { $min: <number> }
                if(criteria.$min) {
                    // Validate criteria
                    if(typeof criteria.$min != 'number') {
                        throw new Error(`$min has to be a number: ${criteria.$min}`);
                    }

                    // Validate value matches criteria
                    if(typeof value != 'number') {
                        errors.push(`isn't a number so can't be at a $min of ${criteria.$min}`);
                    }
                    else if(value < criteria.$min) {
                        errors.push(`is less than the $min of ${criteria.$min}`);
                    }

                    valueExpectedToBePlainObject = false;
                }

                // { $code: (value)=>{ return true/false; } } or { $code: "...true/false" } or { $code: "...return true/false" }
                if(criteria.$code) {
                    let success = true;

                    // Validate criteria
                    if(typeof criteria.$code == 'function') {
                        success = criteria.$code(value);
                    }
                    else if(typeof criteria.$code == 'string') {
                        try {
                            success = eval(criteria.$code);
                        }
                        catch(e) {
                            if(e.message == "SyntaxError: Illegal return statement") {
                                // The code has a return, so enclose it in a function and try again
                                success = eval(`(()=>{${criteria.$code}})()`);
                            }
                            else {
                                throw e;
                            }
                        }
                    }
                    else {
                        throw new Error(`$code has to be a function or string: ${criteria.$code}`);
                    }

                    // Validate value matches criteria
                    if(!success) {
                        errors.push(`failed the $code '${criteria.$code}'`);
                    }

                    valueExpectedToBePlainObject = false;
                }

                // { $length: <number> }
                if(criteria.$length) {
                    // Validate criteria
                    if(typeof criteria.$length != 'number') {
                        throw new Error(`$length has to be a number: ${criteria.$length}`);
                    }

                    // Validate value matches criteria
                    if(typeof value != 'object') {
                        errors.push(`isn't an object or array so can't have a $length of ${criteria.$length}`);
                    }
                    else {
                        if(value.hasOwnProperty('length')) {
                            if(value.length != criteria.$length) {
                                errors.push(`doesn't have a $length of ${criteria.$length}`);
                            }
                        }
                        else {
                            errors.push(`doesn't have a length property so can't have a $length of ${criteria.$length}`);
                        }
                    }

                    valueExpectedToBePlainObject = false;
                }

                // { $maxLength: <number> }
                if(criteria.$maxLength) {
                    // Validate criteria
                    if(typeof criteria.$maxLength != 'number') {
                        throw new Error(`$maxLength has to be a number: ${criteria.$maxLength}`);
                    }

                    // Validate value matches criteria
                    if(typeof value != 'object') {
                        errors.push(`isn't an object or array so can't have a $maxLength of ${criteria.$maxLength}`);
                    }
                    else {
                        if(value.hasOwnProperty('length')) {
                            if(value.length > criteria.$maxLength) {
                                errors.push(`is longer than the $maxLength of ${criteria.$maxLength}`);
                            }
                        }
                        else {
                            errors.push(`doesn't have a length property so can't have a $maxLength of ${criteria.$maxLength}`);
                        }
                    }

                    valueExpectedToBePlainObject = false;
                }

                // { $minLength: <number> }
                if(criteria.$minLength) {
                    // Validate criteria
                    if(typeof criteria.$minLength != 'number') {
                        throw new Error(`$minLength has to be a number: ${criteria.$minLength}`);
                    }

                    if(typeof value != 'object') {
                        errors.push(`isn't an object or array so can't have a $minLength of ${criteria.$minLength}`);
                    }
                    else {
                        if(value.hasOwnProperty('length')) {
                            if(value.length < criteria.$minLength) {
                                errors.push(`is shorter than the $minLength of ${criteria.$minLength}`);
                            }
                        }
                        else {
                            errors.push(`doesn't have a length property so can't have a $minLength of ${criteria.$minLength}`);
                        }
                    }

                    valueExpectedToBePlainObject = false;
                }

                // { $exact: true }
                if(criteria.$exact) {
                    if(typeof value != 'object') {
                        errors.push(`not an object`);
                    }
                    else {
                        // Compare value and criteria, key by key
                        let valueKeys = Object.keys(value);
                        let criteriaKeys = Object.keys(criteria);

                        // Make sure every key in criteria exists in value
                        for(let key in criteria) {
                            if(criteria.hasOwnProperty(key) && !key.startsWith('$')) {
                                if(!value.hasOwnProperty(key)) {
                                    errors.push(`doesn't have key '${key}'`);
                                }
                                else {
                                    value[key] = this.comparison(value[key], criteria[key]);
                                }
                            }
                        }

                        // Make sure every key in value exists in criteria
                        for(let key in value) {
                            if(value.hasOwnProperty(key)) {
                                if(!criteria.hasOwnProperty(key)) {
                                    value[key] = { errors: [ `this key isn't in $exact object` ], value: value[key] };
                                }
                            }
                        }
                    }

                    valueExpectedToBePlainObject = false;
                }

                // criteria is a plain object that needs to be a subset of the value object
                if(valueExpectedToBePlainObject) {
                    if(typeof value != 'object') {
                        errors.push(`not an object`);
                    }
                    else {
                        // Make sure every non-$ key in criteria matches every key in value
                        for(let key in criteria) {
                            if(criteria.hasOwnProperty(key)) {
                                if(!value.hasOwnProperty(key)) {
                                    errors.push(`doesn't have key '${key}'`);
                                }
                                else {
                                    value[key] = this.comparison(value[key], criteria[key]);
                                }
                            }
                        }
                    }
                }
            }
        }
        else { // criteria is a primitive
            if(value !== criteria) {
                errors.push(`doesn't equal ${criteria}`);
            }
        }

        return { errors: errors, value: value };
    }

    /**
     * Tries to match the given object against the given criteria
     * @param {Object} obj - The object or array to check. Must not have circular references.
     * @param {Object} criteria - The object or array specifying criteria for obj to match
     * @throws {Error} If obj doesn't match criteria
     */
    static matchObj(obj, criteria) {
        let objClone = clonedeep(obj);
        let ret = this.comparison(objClone, criteria);
        if(this.hasErrors(ret)) {
            throw new Error(print(ret));
        }
    }

    /**
     * Same as matchObj(), but takes in json instead of an object
     */
    static matchJson(json, criteria) {
        let obj = JSON.parse(json);
        this.matchObj(obj, criteria);
    }

    /**
     * @param {Object} obj - An object that came out of comparison()
     * @return {Boolean} True if obj has errors in it, false otherwise
     */
    static hasErrors(obj) {
        if(obj.errors.length > 0) {
            return true;
        }
        else {
            if(typeof obj.value == 'object') {
                if(obj.value instanceof Array) {
                    for(let item of obj.value) {
                        if(this.hasErrors(item)) {
                            return true;
                        }
                    }
                }
                else { // plain object
                    for(let key in obj.value) {
                        if(obj.value.hasOwnProperty(key)) {
                            if(this.hasErrors(obj.value[key])) {
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

        return false;
    }

    /**
     * @param {Object} obj - An object that came out of comparison()
     * @param {Number} [indents] - The number of indents at this obj, 0 if omitted
     * @return {String} The pretty-printed version of obj
     */
    static print(obj, indents) {
        if(!indents) {
            indents = 0;
        }

        let spaces = outputIndents(indents);
        let nextSpaces = outputIndents(indents + 1);
        let ret = '';

        if(typeof obj.value == 'object') {
            if(obj.value instanceof Array) {
                ret += '[' + outputErrors(obj.errors) + '\n';
                let outputted = false;
                for(let item of obj.value) {
                    ret += nextSpaces + this.print(item, indents + 1) + ',\n';
                    outputted = true;
                }

                // Slice off last ',\n'
                if(outputted) {
                    ret = ret.slice(0, -2);
                }

                ret += spaces + ']\n';
            }
            else { // plain object
                ret += '{' + outputErrors(obj.errors) + '\n';
                let outputted = false;
                for(let key in obj.value) {
                    if(obj.value.hasOwnProperty(key)) {
                        let hasWeirdChars = key.match(/[^A-Za-z0-9]/); // put quotes around the key if there are non-standard chars in it
                        ret += nextSpaces + (hasWeirdChars && '"') + key + (hasWeirdChars && '"') + ': ' + this.print(obj.value[key], indents + 1) + ',\n';
                        outputted = true;
                    }
                }

                // Slice off last ',\n'
                if(outputted) {
                    ret = ret.slice(0, -2);
                }

                ret += spaces + '}\n';
            }
        }
        else { // primitive
            ret = spaces + JSON.stringify(obj) + outputErrors(obj.errors);;
        }

        return ret;

        function outputIndents(num) {
            const SPACES_PER_INDENT = 4;
            let spaces = '';
            for(let i = 0; i < num * SPACES_PER_INDENT; i++) {
                spaces += ' ';
            }
            return spaces;
        }

        function outputErrors(errors) {
            let ret = '';
            if(errors.length > 0) {
                ret = '   --> ';
            }

            for(let error of errors) {
                ret += error.slice(0, 50) + ', ';
            }

            // Slice off last ', '
            ret = ret.slice(0, -2);

            return ret;
        }
    }

}
module.exports = Comparer;
