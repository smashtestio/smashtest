const utils = require('../../src/utils.js');
const Constants = require('../../src/constants.js');

class ElementFinder {
    /**
     * Constructs this EF and its child EFs from a string
     * An EF object represents a single line in an EF string (which may have multiple lines)
     * Gives this EF a 'visible' prop by default, unless 'visible', 'not visible', or 'any visibility' is explicitly included
     * @param {String} str - The string to parse, which may contain multiple lines representing an element and its children
     * @param {Object} [definedProps] - An object containing a map of prop name to array of ElementFinders or functions (the prop matches if at least one of these EFs/functions match)
     * @param {Object} [usedDefinedProps] - Members of definedProps that are actually used by this EF and its children
     * @param {Function} [logger] - The function used to log, which takes in as a parameter the string to log
     * @param {ElementFinder} [parent] - The ElementFinder that's the parent of this one, none if ommitted
     * @param {Number} [lineNumberOffset] - Offset line numbers by this amount (if this EF has a parent), 0 if omitted
     * @param {Boolean} [noParse] - If true, do not parse str
     * @throws {Error} If there is a parse error
     */
    constructor(str, definedProps, usedDefinedProps, logger, parent, lineNumberOffset, noParse) {
        this.line = '';                     // The full line representing this EF

        this.counter = { min: 1, max: 1, default: true };  // Counter associated with this EF, { min: N, max: M }, where both min and max are optional (if omitted, equivalent to { min: 1, max: 1 } )

        this.props = [];                    // Array of Object representing the props of this EF (i.e., 'text', selector, defined props)
                                            // Each object in the array has the following format:
                                            //   { prop: 'full prop text', def: 'name of prop', input: 'input text if any', not: true or undefined }
                                            //
                                            // a prop of just `'text'` is converted to the prop `contains 'text'`
                                            // a css selector is converted to the prop `selector 'text'`
                                            // an ord is converted to the prop `position 'N'`

        this.parent = parent;               // Parent EF, if one exists
        this.children = [];                 // Array of ElementFinder. The children of this EF.

        /*
        OPTIONAL

        this.matchMe = false;               // If true, this is an [element] (enclosed in brackets)
        this.isElemArray = false;           // If true, this is an element array
        this.isAnyOrder = false;            // If true, this.children can be in any order

        this.usedDefinedProps = {};
        this.logger = undefined;

        this.fullStr = '';                  // The full string representing the top EF and its children. Only set this for the top parent EF.

        SET INSIDE BROWSER

        this.error = undefined;             // Set to an error string if there was an error finding this EF, set to true if there's an error on a child
        this.blockErrors = undefined;       // Set to an array of objs { header: '', body: '' } representing errors to be rendered as blocks

        this.matchedElems = [];             // DOM Elements or WebElements that match this EF
        this.matchMeElems = [];             // DOM Elements or WebElements that match [bracked lines] inside this EF. Use this instead of matchedElems if it has > 0 elements inside.
        */

        if(!usedDefinedProps) { // only create one usedDefinedProps object, and only on the top parent
            usedDefinedProps = {};
        }
        this.usedDefinedProps = usedDefinedProps;

        logger && (this.logger = logger);

        // Parse str into this EF
        if(!noParse) {
            this.parseIn(str, definedProps || ElementFinder.defaultProps(), this.usedDefinedProps, lineNumberOffset || 0);
        }
    }

    /**
     * Parses the given string into this EF
     * Same params as in constructor, but all params are mandatory
     * @return This object
     * @throws {Error} If there is a parse error
     */
    parseIn(str, definedProps, usedDefinedProps, lineNumberOffset) {
        if(!str || !str.trim()) {
            throw new Error(`Cannot create an empty ElementFinder`);
        }

        let lines = str.split(/\n/);

        // Strip out // comments
        for(let k = 0; k < lines.length; k++) {
            let line = lines[k];
            line = line.replace(Constants.QUOTED_STRING_LITERAL, ''); // remove strings, since a // inside a string doesn't count
            let matches = line.match(/\/\/.*$/);
            if(matches) {
                lines[k] = line.replace(matches[0], '');
            }
        }

        // Find parent line
        let parentLine = null;
        let parentLineNumber = null;

        for(let i = 0; i < lines.length; i++) {
            let line = lines[i];
            if(line.trim() != '') {
                parentLine = line;
                parentLineNumber = i + 1;
                break;
            }
        }

        let filename = 'line';
        let baseIndent = utils.numIndents(parentLine, filename, parentLineNumber);

        // If there is more than one line at baseIndent, make this a body EF and all of str will be its children
        for(let i = parentLineNumber; i < lines.length; i++) {
            let line = lines[i];
            if(line.trim() != '') {
                let indents = utils.numIndents(line, filename, i + 1);
                if(indents == baseIndent) {
                    let spaces = utils.getIndents(1);
                    lines = lines.map(line => spaces + line);

                    lines.unshift(utils.getIndents(baseIndent) + 'body');

                    parentLine = lines[0];
                    parentLineNumber = 1;

                    break;
                }
            }
        }

        // Parse parentLine
        parentLine = parentLine.trim();
        this.line = parentLine;
        if(parentLine[0] == '*') { // Element Array
            this.isElemArray = true;
            this.counter = { min: 0 };
            parentLine = parentLine.substr(1).trim(); // drop the *

            if(this.parent && this.parent.isElemArray) {
                utils.error(`Cannot have element array inside element array`, filename, parentLineNumber + lineNumberOffset);
            }
        }

        if(parentLine == 'any order' && !this.isElemArray) { // 'any order' keyword
            if(this.parent) {
                this.parent.isAnyOrder = true;
                this.empty = true;
            }
            else {
                utils.error(`The 'any order' keyword must have a parent element`, filename, parentLineNumber + lineNumberOffset);
            }
        }
        else {
            // Check for [element]
            let matches = parentLine.match(/^\[(.*)\]$/);
            if(matches) {
                this.matchMe = true;
                parentLine = matches[1].trim();
            }

            // Check for counter
            const COUNTER_REGEX = /^([0-9]+)(\s*([\-\+])(\s*([0-9]+))?)?\s*x\s+/;
            matches = parentLine.match(COUNTER_REGEX);
            if(matches) {
                if(this.isElemArray) {
                    utils.error(`An element array is not allowed to have a counter`, filename, parentLineNumber + lineNumberOffset);
                }

                parentLine = parentLine.replace(COUNTER_REGEX, ''); // remove counter

                let min = matches[1];
                let middle = matches[3];
                let max = matches[5];

                if(middle == '-') {
                    if(typeof max == 'undefined') { // N-
                        this.counter = { min: parseInt(min) };
                    }
                    else { // N-M
                        this.counter = { min: parseInt(min), max: parseInt(max) };
                    }
                }
                else if(middle == '+') { // N+
                    this.counter = { min: parseInt(min) };
                }
                else { // N
                    this.counter = { min: parseInt(min), max: parseInt(min) };
                }

                if(this.counter.max < this.counter.min) {
                    utils.error(`A counter's max cannot be less than its min`, filename, parentLineNumber + lineNumberOffset);
                }
            }

            // Split into comma-separated props
            const PROP_REGEX = /(((?<!(\\\\)*\\)('([^\\']|(\\\\)*\\.)*')|(?<!(\\\\)*\\)("([^\\"]|(\\\\)*\\.)*"))|[^\,])*/g;
            let propStrs = parentLine.match(PROP_REGEX).filter(propStr => propStr.trim() != '');
            let implicitVisible = true;

            for(let i = 0; i < propStrs.length; i++) {
                let propStr = propStrs[i].trim();
                let prop = {};

                let canonPropStr = null;
                let input = null;

                // not keyword
                let isNot = false;
                if(propStr.match(/^not /)) {
                    propStr = propStr.replace(/^not /, '').trim();
                    isNot = true;
                }

                // ords (convert to `position 'N'`)
                const ORD_REGEX = /([0-9]+)(st|nd|rd|th)/;
                let matches = propStr.match(ORD_REGEX);
                if(matches) {
                    canonPropStr = `position`;
                    input = parseInt(matches[1]);
                }
                else {
                    // 'text' (convert to `contains 'text'`)
                    matches = propStr.match(Constants.QUOTED_STRING_LITERAL_WHOLE);
                    if(matches) {
                        canonPropStr = `contains`;
                        input = utils.unescape(utils.stripQuotes(propStr));
                    }
                    else {
                        // If not found in definedProps, it's a css selector (convert to `selector 'selector'`)
                        if(!definedProps.hasOwnProperty(ElementFinder.canonicalizePropStr(propStr)[0])) {
                            canonPropStr = `selector`;
                            input = propStr;
                        }
                    }
                }

                // Set prop based on the correct entry in definedProps

                if(!canonPropStr) { // if it hasn't been set yet
                    [canonPropStr, input] = ElementFinder.canonicalizePropStr(propStr);
                }

                if(definedProps.hasOwnProperty(canonPropStr)) {
                    this.addProp((isNot ? 'not ' : '') + propStr, canonPropStr, input, isNot, definedProps);

                    if(['visible', 'any visibility'].indexOf(canonPropStr) != -1) {
                        implicitVisible = false;
                    }
                }
                else { // rare case (usually if someone explicitly overrides the selector prop)
                    utils.error(`Cannot find property that matches \`${canonPropStr}\``, filename, parentLineNumber + lineNumberOffset);
                }
            }

            // Apply the 'visible' property, except if 'visible', 'not visible', or 'any visibility' was explicitly listed
            if(implicitVisible) {
                this.addProp('visible', 'visible', undefined, undefined, definedProps);
            }
        }

        // Parse children
        let childObjs = [];
        for(let i = parentLineNumber; i < lines.length; i++) {
            let line = lines[i];
            let lineNumber = i + 1 + lineNumberOffset;

            if(line.trim() == '') {
                if(childObjs.length != 0) {
                    childObjs[childObjs.length - 1].str += `\n${line}`; // goes onto the end of the last child
                }

                continue;
            }

            let indents = utils.numIndents(line, filename, lineNumber) - baseIndent;

            if(indents < 0) {
                utils.error(`ElementFinder cannot have a line that's indented left of the first line`, filename, lineNumber);
            }
            else if(indents == 1) {
                childObjs.push({str: line, lineNumber: lineNumber}); // a new child is formed
            }
            else { // indents > 1
                if(childObjs.length == 0) {
                    utils.error(`ElementFinder cannot have a line that's indented more than once compared to the line above`, filename, lineNumber);
                }

                childObjs[childObjs.length - 1].str += `\n${line}`; // string goes onto the end of the last child
            }
            // NOTE: indents == 0 shouldn't occur
        }

        childObjs.forEach(c => {
            let childEF = new ElementFinder(c.str, definedProps, usedDefinedProps, this.logger, this, c.lineNumber + lineNumberOffset - 1);
            if(!childEF.empty) {
                this.children.push(childEF);
            }
        });

        return this;
    }

    /**
     * Includes the given prop in this EF (placed at the end of the list of props)
     */
    addProp(prop, def, input, isNot, definedProps) {
        let self = this;

        function addToUsedDefinedProps(def) {
            if(!self.usedDefinedProps.hasOwnProperty(def)) {
                self.usedDefinedProps[def] = definedProps[def];
                self.usedDefinedProps[def].forEach(d => {
                    if(d instanceof ElementFinder) {
                        d.props.forEach(prop => addToUsedDefinedProps(prop.def));
                    }
                });
            }
        }

        let propObj = {
            prop: prop,
            def: def
        };
        typeof input != 'undefined' && (propObj.input = input);
        isNot && (propObj.not = true);

        this.props.push(propObj);

        addToUsedDefinedProps(def);
    }

    /**
     * Parses a plain object in the form of an ElementFinder and converts it into an ElementFinder object
     * Handles all children as well
     * @param {Object} obj - The plain object to convert
     * @return {ElementFinder} The EF derived from obj
     */
    static parseObj(obj) {
        let ef = new ElementFinder(undefined, undefined, undefined, undefined, undefined, undefined, true);
        Object.assign(ef, obj);
        for(let i = 0; i < ef.children.length; i++) {
            ef.children[i] = ElementFinder.parseObj(ef.children[i]);
        }
        return ef;
    }

    /**
     * @param {String} [errorStart] - String to mark the start of an error, '-->' if omitted
     * @param {String} [errorEnd] - String to mark the end of an error, '' if omitted
     * @param {Number} [indents] - The number of indents at this value, 0 if omitted
     * @return {String} A prettified version of this EF and its children, including errors
     */
    print(errorStart, errorEnd, indents) {
        indents = indents || 0;
        let errorStartStr = errorStart || '-->';
        let errorEndStr = errorEnd || '';

        let spaces = utils.getIndents(indents);
        let nextSpaces = utils.getIndents(indents + 1);

        let error = '';
        if(this.error && this.error !== true) {
            error = `  ${errorStartStr}  ${this.error}${errorEndStr}`;
        }

        let blockErrors = '';
        if(this.blockErrors) {
            this.blockErrors.forEach(blockError => {
                blockErrors += '\n' + nextSpaces + errorStartStr + ' ' + blockError.header + '\n' + nextSpaces + blockError.body + errorEndStr + '\n';
            });
        }
        if(blockErrors) {
            blockErrors = '\n' + blockErrors;
        }

        let children = '';
        if(this.isAnyOrder) {
            children += '\n' + nextSpaces + 'any order';
        }
        if(this.children.length > 0) {
            children += '\n';
            for(let i = 0; i < this.children.length; i++) {
                children += this.children[i].print(errorStart, errorEnd, indents + 1) + (i < this.children.length - 1 ? '\n' : '');
            }
        }

        return spaces + this.line + error + children + blockErrors;
    }

    /**
     * @return {Boolean} True if this EF or one of its descendants has an error or block error, false otherwise
     */
    hasErrors() {
        if(this.error || (this.blockErrors && this.blockErrors.length > 0)) {
            return true;
        }

        for(let child of this.children) {
            if(child.hasErrors()) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return {Object} An object representing this EF and its children, ready to be fed into JSON.stringify()
     */
    serialize() {
        let o = {
            line: this.line,
            counter: this.counter,
            props: this.props,
            children: []
        };

        this.matchMe && (o.matchMe = true);
        this.isElemArray && (o.isElemArray = true);
        this.isAnyOrder && (o.isAnyOrder = true);

        !this.parent && (o.fullStr = this.print());

        this.children.forEach(child => o.children.push(child.serialize()));

        return o;
    }

    /**
     * @return {String} JSON representation of this EF, its children, and used defined props
     * Functions are converted to strings
     */
    serializeJSON() {
        return JSON.stringify({
            ef: this.serialize(),
            definedProps: this.usedDefinedProps
        },
        (k, v) => {
            if(typeof v == 'function') {
                return v.toString();
            }
            else if(v instanceof ElementFinder) {
                return v.serialize();
            }
            else {
                return v;
            }
        });
    }

    /**
     * Finds all elements matching this EF at the current moment in time
     * @param {Driver} driver - WebDriver object with which to look for this EF
     * @param {WebElement} [parentElem] - Only search at or inside this WebDriver WebElement, search anywhere on the page if omitted
     * @return {Promise} Promise that resolves to the object { ef: this ef with errors set, matches: Array of WebElements that were matched }
     * @throws {Error} If an element array wasn't properly matched
     */
    async getAll(driver, parentElem) {
        let obj = await driver.executeScript(function() {
            let payload = JSON.parse(arguments[0]);
            let ef = payload.ef;
            let definedProps = payload.definedProps;
            let parentElem = arguments[1];

            findEF(ef, parentElem ? toArray(parentElem.querySelectorAll('*')).concat([parentElem]) : toArray(document.querySelectorAll('*')));
            let matches = (ef.matchMeElems && ef.matchMeElems.length > 0) ? ef.matchMeElems : ef.matchedElems;

            const SEPARATOR = "%c――――――――――――――――――――――――――――――――――――――――――";
            const SEPARATOR_STYLE = "color: #C0C0C0";
            const HEADING_STYLE = "font-weight: bold";

            console.log(SEPARATOR, SEPARATOR_STYLE);
            console.log("%cElementFinder: ", HEADING_STYLE);
            console.log(ef.fullStr.replace(/^(.*)$/g, '    $1'));
            console.log(ef);
            if(parentElem) {
                console.log("%cParent:", HEADING_STYLE);
                console.log(parentElem);
            }
            console.log("%cMatches:", HEADING_STYLE);
            console.log(matches);

            return {
                ef: ef,
                matches: matches
            };

            /**
             * Finds elements from pool that match the given ef
             * Sets ef.matchedElems, ef.matchMeElems, ef.error, and/or ef.blockErrors
             * @param {ElementFinder} ef - The ElementFinder to match
             * @param {Array of Element} pool - Array of DOM elements from which to choose from
             * @param {Boolean} [additive] - If true, add to ef's existing matchedElems (don't clear it out)
             * @param {Boolean} [single] - If true, ignore ef's counter and uses a counter of 1x
             */
            function findEF(ef, pool, additive, single) {
                // Clear out existing state
                if(!ef.blockErrors || !additive) {
                    ef.blockErrors = [];
                }
                if(!additive) {
                    ef.error = null;
                }
                if(!ef.matchMeElems) {
                    ef.matchMeElems = [];
                }
                if(!ef.matchedElems || !additive) {
                    ef.matchedElems = [];
                }

                let min = ef.counter.min;
                let max = ef.counter.max;
                if(single) {
                    min = 1;
                    max = 1;
                }

                let topElems = findTopEF(ef, pool);
                let originalTopElemCount = topElems.length;

                if(!hasTopErrors(ef)) {
                    if(ef.isElemArray) {
                        if(ef.isAnyOrder) { // Element array, any order
                            // Remove from topElems the elems that match up with a child EF
                            let foundElems = [];
                            for(let childEF of ef.children) {
                                findEF(childEF, topElems);
                                removeFromArr(topElems, childEF.matchedElems);
                                foundElems = foundElems.concat(childEF.matchedElems);
                            }

                            if(topElems.length > 0) {
                                // Set block error for each of topElems still around (these elems weren't matched by the elem array)
                                for(let topElem of topElems) {
                                    ef.blockErrors.push({ header: 'missing', body: elemSummary(topElem) });
                                }
                            }
                            else {
                                // Successful match
                                ef.matchedElems = foundElems;
                            }
                        }
                        else { // Element array, in order
                            let indexE = 0; // index within topElems
                            let indexC = 0; // index within ef.children

                            while(indexE < topElems.length || indexC < ef.children.length) { // while at least one index is valid
                                let currTopElem = topElems[indexE];
                                let currChildEF = ef.children[indexC];

                                if(!currChildEF) { // indexC went over the edge
                                    ef.blockErrors.push({ header: 'missing', body: elemSummary(currTopElem) });
                                    indexE++;
                                }
                                else if(!currTopElem) { // indexE went over the edge
                                    if(currChildEF.matchedElems) {
                                        if(currChildEF.matchedElems.length < currChildEF.counter.min) {
                                            currChildEF.error = 'only found ' + currChildEF.matchedElems.length;
                                            ef.error = true;
                                        }
                                    }
                                    else {
                                        currChildEF.error = 'not found';
                                        ef.error = true;
                                    }

                                    indexC++;
                                }
                                else { // both indexes still good
                                    let matchesBefore = [].concat(currChildEF.matchedElems || []);
                                    findEF(currChildEF, [currTopElem], true, true);

                                    if(currChildEF.matchedElems.length > matchesBefore.length) { // currChildEF matches currTopElem
                                        indexE++;

                                        if(currChildEF.matchedElems.length == currChildEF.counter.max) {
                                            indexC++;
                                        }
                                    }
                                    else {
                                        if(currChildEF.matchedElems.length == 0) {
                                            if(hasChildErrors(currChildEF)) {
                                                currChildEF.error = true;
                                            }
                                            else {
                                                currChildEF.error = "doesn't match " + elemSummary(currTopElem);
                                            }
                                            ef.error = true;
                                            indexE++;
                                        }
                                        else if(currChildEF.matchedElems.length < currChildEF.counter.min) {
                                            currChildEF.error = 'only found ' + currChildEF.matchedElems.length;
                                            ef.error = true;
                                        }

                                        indexC++;
                                    }
                                }
                            }
                        }
                    }
                    else { // Normal EF
                        for(let i = 0; i < topElems.length && (typeof max == 'undefined' || i < max);) {
                            let topElem = topElems[i];
                            let pool = toArray(topElem.querySelectorAll('*')); // all elements under topElem
                            let remove = false;

                            for(let childEF of ef.children) {
                                if(pool.length == 0) {
                                    remove = true; // topElem has no children left, but more children are expected, so remove topElem from contention
                                    break;
                                }

                                findEF(childEF, pool);

                                if(hasTopErrors(childEF)) {
                                    remove = true; // topElem's children don't match, so remove it from contention
                                    break;
                                }

                                let elemsMatchingChild = childEF.matchedElems;
                                if(ef.isAnyOrder) {
                                    // Remove all elemsMatchingChild and their descendants from pool
                                    removeFromArr(pool, elemsMatchingChild);
                                    elemsMatchingChild.forEach(function(elem) {
                                        removeFromArr(pool, toArray(elem.querySelectorAll('*')));
                                    });
                                }
                                else {
                                    // Remove from pool all elems before the last elem in elemsMatchingChild
                                    pool.splice(0, pool.indexOf(elemsMatchingChild[elemsMatchingChild.length - 1]) + 1);
                                }
                            }

                            if(remove) {
                                removeFromArr(topElems, [topElem]);
                            }
                            else {
                                i++;
                            }
                        }

                        if(topElems.length == 0) {
                            if(min > 0) {
                                if(originalTopElemCount == 1) {
                                    ef.error = "found, but doesn't contain the right children";
                                }
                                else {
                                    ef.error = originalTopElemCount + " found, but none contain the right children";
                                    clearErrorsOfChildren(ef);
                                }

                                if(!ef.isAnyOrder) {
                                    ef.error += " (in the right order)";
                                }
                            }
                        }
                        else if(topElems.length < min) {
                            ef.error = 'only found ' + topElems.length;
                        }
                    }
                }

                if(!hasTopErrors(ef)) {
                    // Success. Set ef.matchedElems
                    if(typeof max != 'undefined') {
                        ef.matchedElems = ef.matchedElems.concat(topElems.slice(0, max)); // only take up to max elems
                    }
                    else {
                        ef.matchedElems = ef.matchedElems.concat(topElems);
                    }

                    // Copy over matchedElems if this EF has matchMe set
                    if(ef.matchMe) {
                        ef.matchMeElems = ef.matchMeElems.concat(ef.matchedElems);
                    }

                    // Copy over matchMeElems from children (only elements that aren't already in ef.matchMeElems)
                    ef.children.forEach(function(childEF) {
                        if(childEF.matchMeElems) {
                            for(let matchMeElem of childEF.matchMeElems) {
                                if(ef.matchMeElems.indexOf(matchMeElem) == -1) {
                                    ef.matchMeElems.push(matchMeElem);
                                }
                            }
                        }
                    });

                    clearErrorsOfChildren(ef);
                }
            }

            /**
             * @return {Array of Element} Elements from pool that match the top line in ef. Ignores the counter.
             */
            function findTopEF(ef, pool) {
                for(let prop of ef.props) {
                    let approvedElems = [];

                    if(!definedProps.hasOwnProperty(prop.def)) {
                        ef.error = "ElementFinder prop '" + prop.def + "' is not defined";
                        return [];
                    }

                    for(let def of definedProps[prop.def]) {
                        if(typeof def == 'object') { // def is an EF
                            def.counter = { min: 0 }; // match multiple elements
                            findEF(def, pool);
                            let matched = def.matchMeElems && def.matchMeElems.length > 0 ? def.matchMeElems : def.matchedElems;
                            approvedElems = approvedElems.concat(intersectArr(pool, matched));
                        }
                        else if(typeof def == 'string') { // stringified function
                            eval('var f = ' + def.replace(/\n/g, '\n'));
                            approvedElems = approvedElems.concat(f(pool, prop.input));
                        }
                    }

                    pool = prop.not ? intersectArrNot(pool, approvedElems) : intersectArr(pool, approvedElems);

                    if(pool.length == 0) {
                        if(ef.counter.min > 0 || ef.isElemArray) {
                            ef.error = 'not found (zero matches after `' + prop.prop + '` applied)';
                        }
                        break;
                    }
                }

                return pool;
            }

            /**
             * @return {Boolean} true if the given EF's top parent has errors, false otherwise (only applies to top EF, not children)
             */
            function hasTopErrors(ef) {
                return ef.error || (ef.blockErrors && ef.blockErrors.length > 0);
            }

            /**
             * @return {Boolean} true if the given EF's children have errors, false otherwise
             */
            function hasChildErrors(ef) {
                for(let childEF of ef.children) {
                    if(childEF.error || (childEF.blockErrors && childEF.blockErrors.length > 0)) {
                        return true;
                    }
                }

                return false;
            }


            /**
             * @return {String} A summary of the given elem
             */
            function elemSummary(elem) {
                return `${elem.tagName.toLowerCase()}${elem.id ? `#${elem.id}`: ``}${elem.className ? elem.className.trim().replace(/^\s*|\s+/g, `.`) : ``}`;
            }

            /**
             * Clears errors of the given EF's children
             */
            function clearErrorsOfChildren(ef) {
                for(let childEF of ef.children) {
                    childEF.error = null;
                    childEF.blockErrors = [];
                    clearErrorsOfChildren(childEF);
                }
            }

            /**
             * @param {List or Array} list
             * @return {Array} Array with same contents as arr
             */
            function toArray(list) {
                let newArr = [];
                for(let item of list) {
                    newArr.push(item);
                }
                return newArr;
            }

            /**
             * @param {Array} arr1
             * @param {Array} arr2
             * @return {Array} Array consisting of items found in both arr1 and arr2
             */
            function intersectArr(arr1, arr2) {
                let newArr = [];
                for(let i = 0; i < arr1.length; i++) {
                    for(let j = 0; j < arr2.length; j++) {
                        if(arr1[i] === arr2[j]) {
                            newArr.push(arr1[i]);
                            break;
                        }
                    }
                }

                return newArr;
            }

            /**
             * @param {Array} arr1
             * @param {Array} arr2
             * @return {Array} Array consisting of items found in arr1 and not in arr2
             */
            function intersectArrNot(arr1, arr2) {
                let newArr = [];
                for(let i = 0; i < arr1.length; i++) {
                    let found = false;
                    for(let j = 0; j < arr2.length; j++) {
                        if(arr1[i] === arr2[j]) {
                            found = true;
                            break;
                        }
                    }
                    if(!found) {
                        newArr.push(arr1[i]);
                    }
                }

                return newArr;
            }

            /**
             * Removes from array arr the items inside array items
             */
            function removeFromArr(arr, items) {
                for(let i = 0; i < arr.length;) {
                    if(items.indexOf(arr[i]) != -1) {
                        arr.splice(i, 1);
                    }
                    else {
                        i++;
                    }
                }
            }
        }, this.serializeJSON(), parentElem);

        return {
            ef: obj.ef,
            matches: obj.matches || []
        };
    }

    /**
     * Finds all elements matching this EF
     * @param {Driver} driver - WebDriver object with which to look for this EF
     * @param {WebElement} [parentElem] - Only search at or inside this WebDriver WebElement, search anywhere on the page if omitted
     * @param {Boolean} [isNot] - If true, throws error if elements are still found after timeout
     * @param {Boolean} [isContinue] - How to set Error.continue, if an Error is thrown
     * @param {Number} [timeout] - Number of ms to continue trying before giving up. If omitted or set to 0, only try once before giving up.
     * @param {Number} [pollFrequency] - How often to poll for a matching element, in ms. If omitted, polls every 500 ms.
     * @return {Promise} Promise that resolves to Array of WebDriver WebElements that were found (resolves to nothing if isNot is set)
     * @throws {Error} If matching elements weren't found in time, or if an element array wasn't properly matched in time (if isNot is set, only throws error is elements still found after timeout)
     *                 Includes ANSI escape codes in error's stacktrace to color -->'s as red in the console
     */
    async find(driver, parentElem, isNot, isContinue, timeout, pollFrequency) {
        timeout = timeout || 0;
        pollFrequency = pollFrequency || 500;

        let start = new Date();
        let results = null;
        let self = this;

        return await new Promise(async (resolve, reject) => {
            try {
                await doFind();
                async function doFind() {
                    results = await self.getAll(driver, parentElem);
                    results.ef = ElementFinder.parseObj(results.ef);
                    if(!isNot ? results.ef.hasErrors() : (results.matches && results.matches.length > 0)) {
                        let duration = (new Date()) - start;
                        if(duration > timeout) {
                            let error =
                                !isNot ?
                                new Error(`Element${self.counter.max == 1 ? `` : `s`} not found${timeout > 0 ? ` in time (${timeout/1000} s)` : ``}:\n\n${results.ef.print(Constants.CONSOLE_END_COLOR + Constants.CONSOLE_START_RED + `-->`, Constants.CONSOLE_END_COLOR + Constants.CONSOLE_START_GRAY)}`) :
                                new Error(`Element${self.counter.max == 1 ? `` : `s`} still found${timeout > 0 ? ` after timeout (${timeout/1000} s)` : ``}`);

                            if(isContinue) {
                                error.continue = true;
                            }

                            reject(error);
                        }
                        else {
                            setTimeout(doFind, pollFrequency);
                        }
                    }
                    else {
                        resolve(results.matches);
                    }
                }
            }
            catch(e) {
                reject(e);
            }
        });
    }

    /**
     * @return {Object} An object with all the default props to be fed into the constructor's definedProps
     * NOTE: definedProps are injected into the browser to be executed, so don't reference anything outside each function and
     * make sure all js features used will work in every browser supported
     */
    static defaultProps() {
        return {
            'visible': [
                function(elems, input) {
                    return elems.filter(function(elem) {
                        if(elem.offsetWidth == 0 || elem.offsetHeight == 0) {
                            return false;
                        }

                        var cs = window.getComputedStyle(elem);

                        if(cs.visibility == 'hidden' || cs.visibility == 'collapse') {
                            return false;
                        }

                        if(cs.opacity == '0') {
                            return false;
                        }

                        // Check opacity of parents
                        elem = elem.parentElement;
                        while(elem) {
                            cs = window.getComputedStyle(elem);
                            if(cs.opacity == '0') {
                                return false;
                            }
                            elem = elem.parentElement;
                        }

                        return true;
                    });
                }
            ],

            'any visibility': [
                function(elems, input) {
                    return elems;
                }
            ],

            'enabled': [
                function(elems, input) {
                    return elems.filter(function(elem) {
                        return elem.getAttribute('disabled') === null;
                    });
                }
            ],

            'disabled': [
                function(elems, input) {
                    return elems.filter(function(elem) {
                        return elem.getAttribute('disabled') !== null;
                    });
                }
            ],

            'checked': [
                function(elems, input) {
                    return elems.filter(function(elem) {
                        return elem.checked;
                    });
                }
            ],

            'unchecked': [
                function(elems, input) {
                    return elems.filter(function(elem) {
                        return !elem.checked;
                    });
                }
            ],

            'selected': [
                function(elems, input) {
                    return elems.filter(function(elem) {
                        return elem.selected;
                    });
                }
            ],

            'focused': [
                function(elems, input) {
                    return elems.filter(function(elem) {
                        return elem === document.activeElement;
                    });
                }
            ],

            'element': [
                function(elems, input) {
                    return elems;
                }
            ],

            'clickable': [
                function(elems, input) {
                    return elems.filter(function(elem) {
                        let tagName = elem.tagName.toLowerCase();
                        return (tagName == 'a' ||
                            tagName == 'button' ||
                            tagName == 'label' ||
                            tagName == 'input' ||
                            tagName == 'textarea' ||
                            tagName == 'select' ||
                            tagName == 'option' ||
                            window.getComputedStyle(elem).getPropertyValue('cursor') == 'pointer')
                            && !elem.disabled;
                            // TODO: handle cursor:pointer when hovered over
                    });
                }
            ],

            'page title': [
                function(elems, input) {
                    return document.title == input ? elems : [];
                }
            ],

            'page title contains': [
                function(elems, input) {
                    return document.title.toLowerCase().indexOf(input.toLowerCase()) != -1 ? elems : [];
                }
            ],

            'page url': [
                function(elems, input) { // absolute or relative
                    return window.location.href == input || window.location.href.replace(/^https?:\/\/[^\/]*/, '') == input ? elems : [];
                }
            ],

            'page url contains': [
                function(elems, input) {
                    return window.location.href.indexOf(input) != -1 ? elems : [];
                }
            ],

            // Takes each elem and expands the container around it to its parent, parent's parent etc. until a container
            // containing input is found. Matches multiple elems if there's a tie.
            'next to': [
                function(elems, input) {
                    function canon(str) {
                        return str ? str.trim().toLowerCase().replace(/\s+/g, ' ') : '';
                    }

                    input = canon(input);

                    let containers = elems;
                    let atBody = false;

                    while(!atBody) { // if a container reaches document.body and nothing is still found, input doesn't exist on the page
                        containers = containers.map(function(container) { return container.parentElement });
                        containers.forEach(function(container) {
                            if(container === document.body) {
                                atBody = true;
                            }
                        });

                        let matchedElems = [];

                        containers.forEach(function(container, index) {
                            if(canon(container.innerText).indexOf(input) != -1) {
                                matchedElems.push(elems[index]);
                            }
                        });

                        if(matchedElems.length > 0) {
                            return matchedElems;
                        }
                    }

                    return [];
                }
            ],

            'value': [
                function(elems, input) {
                    return elems.filter(function(elem) {
                        return elem.value == input;
                    });
                }
            ],

            // Text is contained in innerText, value (including selected item in a select), placeholder, or associated label innerText
            'contains': [
                function(elems, input) {
                    function canon(str) {
                        return str ? str.trim().toLowerCase().replace(/\s+/g, ' ') : '';
                    }

                    input = canon(input);

                    function isMatch(str) {
                        return canon(str).indexOf(input) != -1;
                    }

                    return elems.filter(function(elem) {
                        let labelText = '';
                        if(elem.id) {
                            let labelElem = document.querySelector('label[for="' + CSS.escape(elem.id) + '"]');
                            if(labelElem) {
                                labelText = labelElem.innerText;
                            }
                        }

                        let dropdownText = '';
                        if(elem.options && typeof elem.selectedIndex != 'undefined' && elem.selectedIndex !== null) {
                            dropdownText = elem.options[elem.selectedIndex].text;
                        }

                        if(elem.tagName.toLowerCase() == 'select') {
                            return isMatch(labelText) ||
                                isMatch(dropdownText);
                        }
                        else {
                            return isMatch(elem.innerText) ||
                                isMatch(elem.value) ||
                                isMatch(elem.placeholder) ||
                                isMatch(labelText) ||
                                isMatch(dropdownText);
                        }
                    });
                }
            ],

            // Text is the exclusive and exact text in innerText, value (including selected item in a select), placeholder, or associated label innerText
            'contains exact': [
                function(elems, input) {
                    function isMatch(str) {
                        return str == input;
                    }

                    return elems.filter(function(elem) {
                        let labelText = '';
                        let labelElem = document.querySelector('label[for="' + CSS.escape(elem.id) + '"]');
                        if(labelElem) {
                            labelText = labelElem.innerText;
                        }

                        let dropdownText = '';
                        if(elem.options && typeof elem.selectedIndex != 'undefined' && elem.selectedIndex !== null) {
                            dropdownText = elem.options[elem.selectedIndex].text;
                        }

                        if(elem.tagName.toLowerCase() == 'select') {
                            return isMatch(labelText) ||
                                isMatch(dropdownText);
                        }
                        else {
                            return isMatch(elem.innerText) ||
                                isMatch(elem.value) ||
                                isMatch(elem.placeholder) ||
                                isMatch(labelText) ||
                                isMatch(dropdownText);
                        }
                    });
                }
            ],

            'innertext': [
                function(elems, input) {
                    return elems.filter(function(elem) {
                        return (elem.innerText || '').indexOf(input) != -1;
                    });
                }
            ],

            'selector': [
                function(elems, input) {
                    let nodes = null;
                    try {
                        nodes = document.querySelectorAll(input);
                    }
                    catch(e) {
                        return [];
                    }

                    let nodesArr = [];
                    for(let node of nodes) {
                        nodesArr.push(node);
                    }
                    return nodesArr.filter(function(node) {
                        return elems.indexOf(node) != -1;
                    });
                }
            ],

            'xpath': [
                function(elems, input) {
                    let result = document.evaluate(input, document, null, XPathResult.ANY_TYPE, null);
                    let node = null;
                    let nodes = [];
                    while(node = result.iterateNext()) {
                        nodes.push(node);
                    }

                    return elems.filter(function(elem) {
                        return nodes.indexOf(elem) != -1;
                    });
                }
            ],

            // Has css style 'name:value'
            'style': [
                function(elems, input) {
                    let matches = input.match(/^([^: ]+):(.*)$/);
                    if(!matches) {
                        return [];
                    }

                    let name = matches[1];
                    let value = matches[2];

                    return elems.filter(function(elem) {
                        return window.getComputedStyle(elem)[name].toString() == value;
                    });
                }
            ],

            // Same as an ord, returns nth elem, where n is 1-indexed
            'position': [
                function(elems, input) {
                    return elems[parseInt(input) - 1];
                }
            ]
        };
    }

    /**
     * Canonicalizes the text of a prop and isolates the input
     * @return {Array} Where index 0 contains str canonicalized and without 'text', and index 1 contains the input (undefined if no input)
     */
    static canonicalizePropStr(str) {
        let canonStr = str
            .replace(Constants.QUOTED_STRING_LITERAL, '')
            .trim()
            .replace(/\s+/g, ' ')
            .toLowerCase();

        let input = (str.match(Constants.QUOTED_STRING_LITERAL) || [])[0];
        if(input) {
            input = utils.stripQuotes(input);
            input = utils.unescape(input);
        }

        return [canonStr, input];
    }
}
module.exports = ElementFinder;
