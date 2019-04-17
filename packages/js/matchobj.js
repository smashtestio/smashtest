const clonedeep = require('lodash/clonedeep');

/**
 * Tries to match the given object against the given criteria
 * @param {Object} obj - The object or array to check. Must not have circular references. If it doesn't match criteria, this object is edited to add errors.
 * @param {Object} criteria - The object or array specifying criteria for obj to match
 * @return {Boolean} False if obj doesn't match criteria, true otherwise
 */
exports.matchObjComponent(obj, criteria, jsonPathOfObj) {
    if(typeof obj == 'object') {
        if(obj instanceof Array) {







        }
        else { // regular js object





        }
    }
    else {
        if(obj != criteria) {






        }
    }
}

/**
 * Tries to match the given object against the given criteria
 * @param {Object} obj - The object or array to check. Must not have circular references.
 * @param {Object} criteria - The object or array specifying criteria for obj to match
 * @throws {Error} If obj doesn't match criteria
 */
exports.matchObj = (obj, criteria) {
    let objClone = clonedeep(obj);
    let isError = exports.matchObjComponent(objClone, criteria);
    if(isError) {
        // TODO: pretty-print objClone





    }
}

/**
 * Same as matchObj(), but takes in json instead of an object
 */
exports.matchJson = (json, criteria) {
    let obj = JSON.parse(json);
    exports.matchObj(obj, criteria);
}
