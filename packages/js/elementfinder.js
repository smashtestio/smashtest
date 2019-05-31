const utils = require('../../utils.js');
const Constants = require('../../constants.js');

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
     * @throws {Error} If there is a parse error
     */
    constructor(str, definedProps, usedDefinedProps, logger, parent, lineNumberOffset) {
        this.line = '';                     // The full line representing this EF

        this.counter = { min: 1, max: 1 };  // Counter associated with this EF, { min: N, max: M }, where both min and max are optional (if omitted, equivalent to { min: 1, max: 1 } )

        this.props = [];                    // Array of Object representing the props of this EF (i.e., 'text', selector, defined props)
                                            // Each object in the array has the following format:
                                            //   { prop: 'full prop text', defs: [ EFs or functions ], input: 'input text if any', not: true or false }
                                            //
                                            // 'text' is converted to the prop "contains 'text'"
                                            // a selector is converted to the prop "selector 'text'"
                                            // an ord is converted to the prop "position 'N'"

        this.parent = parent;               // Parent EF, if one exists
        this.children = [];                 // Array of ElementFinder. The children of this EF.

        /*
        OPTIONAL

        this.matchMe = false;               // If true, this is an [element] (enclosed in brackets)
        this.isElemArray = false;           // If true, this is an element array
        this.isAnyOrder = false;            // If true, this.children can be in any order
        this.isSubset = false;              // If true, this.children can be a subset of the children actually on the page. Only works when this.isArray is true.

        this.error = undefined;             // Set to an error string if there was an error finding this EF
        this.blockErrors = undefined;       // Set to an array of objs { header: '', body: '' } representing errors to be rendered as blocks

        this.usedDefinedProps = {};
        this.logger = undefined;
        */

        if(!usedDefinedProps) { // only create one usedDefinedProps object, and only on the top parent
            this.usedDefinedProps = {};
            usedDefinedProps = this.usedDefinedProps;
        }

        logger && (this.logger = logger);

        // Parse str into this EF
        this.parseIn(str, definedProps || ElementFinder.defaultProps(), usedDefinedProps, lineNumberOffset || 0);
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
            parentLine = parentLine.substr(1).trim(); // drop the *
        }

        if(parentLine == 'any order' && !this.isElemArray) { // 'any order' keyword
            if(this.parent) {
                this.parent.isAnyOrder = true;
                this.empty = true;
            }
            else {
                utils.error(`The 'any order' keyword must have a parent element`, filename, parentLineNumber);
            }
        }
        else if(parentLine == 'subset' && !this.isElemArray) { // 'subset' keyword
            if(this.parent) {
                this.parent.isSubset = true;
                this.empty = true;
            }
            else {
                utils.error(`The 'subset' keyword must have a parent element`, filename, parentLineNumber);
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
                    if(!usedDefinedProps.hasOwnProperty(canonPropStr)) {
                        usedDefinedProps[canonPropStr] = definedProps[canonPropStr];
                    }

                    prop = {
                        prop: (isNot ? 'not ' : '') + propStr,
                        def: canonPropStr
                    };
                    input && (prop.input = input);
                    isNot && (prop.not = true);

                    if(['visible', 'any visibility'].includes(canonPropStr)) {
                        implicitVisible = false;
                    }
                }
                else { // rare case (usually if someone explicitly overrides the selector prop)
                    utils.error(`Cannot find property that matches \`${canonPropStr}\``, filename, parentLineNumber);
                }

                this.props.push(prop);
            }

            // Apply the 'visible' property, except if 'visible', 'not visible', or 'any visibility' was explicitly listed
            if(implicitVisible) {
                this.props.push({
                    prop: 'visible',
                    def: 'visible'
                });
            }
        }

        // Parse children
        let childObjs = [];
        for(let i = parentLineNumber; i < lines.length; i++) {
            let line = lines[i];
            let lineNumber = i + lineNumberOffset + 1;

            if(line.trim() == '') {
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
            let childEF = new ElementFinder(c.str, definedProps, usedDefinedProps, this.logger, this, c.lineNumber + lineNumberOffset);
            if(!childEF.empty) {
                this.children.push(childEF);
            }
        });

        return this;
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
        if(this.error) {
            error = `  ${errorStartStr}  ${this.error}${errorEndStr}`;
        }

        let blockErrors = '';
        if(this.blockErrors) {
            this.blockErrors.forEach(blockError => {
                blockErrors += '\n' + nextSpaces + errorStartStr + ' ' + blockError.header + '\n' + nextSpaces + blockError.body + errorEndStr + '\n';
            });
        }

        let children = '';
        if(this.children.length > 0) {
            children = '\n';
            for(let i = 0; i < this.children.length; i++) {
                children += this.children[i].print(errorStart, errorEnd, indents + 1) + (i < this.children.length - 1 ? '\n' : '');
            }
        }

        return spaces + this.line + error + children + blockErrors;
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
        this.isSubset && (o.isSubset = true);

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
        (k, v) => typeof v == 'function' ? v.toString() : v );
    }

    /**
     * Finds all elements matching this EF at the current moment in time
     * @param {Driver} driver - WebDriver object with which to look for this EF
     * @param {WebElement} [parentElem] - Only search at or inside this WebDriver WebElement, search anywhere on the page if omitted
     * @return {Promise} Promise that resolves to Array of WebDriver WebElements that were found, empty array if nothing found
     * @throws {Error} If an element array wasn't properly matched
     */
    async getAll(driver, parentElem) {
        // TODO: Don't forget to log stuff via this.logger (if it's set)

        return await driver.executeScript(() => {
            let ef = JSON.parse(arguments[0]);
            let parentElem = arguments[1];

            find(ef, parentElem ? parentElem.querySelectorAll('*') : document.querySelectorAll('*'));

            function find(ef, pool) {







            }
        }, this.serializeJSON(), parentElem);

        /*
        TODO:

        matchMeElems = []
        Recursively walk the tree, adding an EF's matchedElems to matchMeElems if that EF's matchMe is set
        If matchMeElems.length > 0
            return matchMeElems
        else
            return ef.matchedElems
        */
    }

    /**
     * Finds the first element matching this EF
     * @param {Driver} driver - WebDriver object with which to look for this EF
     * @param {WebElement} [parentElem] - Only search at or inside this WebDriver WebElement, search anywhere on the page if omitted
     * @param {Boolean} [isContinue] - How to set Error.continue, if an Error is thrown
     * @param {Number} [timeout] - Number of ms to continue trying before giving up. If omitted or set to 0, only try once before giving up.
     * @param {Number} [pollFrequency] - How often to poll for a matching element, in ms. If omitted, polls every 500 ms.
     * @return {Promise} Promise that resolves to the WebDriver WebElement that was found
     * @throws {Error} If a matching element wasn't found in time, or if an element array wasn't properly matched
     */
    async find(driver, parentElem, isContinue, timeout, pollFrequency) {
        // TODO: poll and enforce timeout
        // Use this.getAll()


        /*
        let elems = this.findElements(driver, parentElem, isContinue, timeout, pollFrequency);
        if(elems.length == 0) {
            throw new Error(`Element not found${!timeout ? ' in time' : ''}`);
        }
        else {
            return elems[0];
        }
        */







    }

    /**
     * Finds all elements matching this EF
     * Params same as in find()
     * @return {Promise} Promise that resolves to Array of WebDriver WebElements that were found, empty array if nothing found in time
     * @throws {Error} If an element array wasn't properly matched
     */
    async findAll(driver, parentElem, isContinue, timeout, pollFrequency) {
        // TODO: Don't forget to log stuff via this.logger (if it's set)
        // Use this.getAll()





    }

    /**
     * Ensures that this EF cannot be found
     * Params same as in find()
     * @throws {Error} If this EF is still found after the timeout expires
     */
    async not(driver, parentElem, isContinue, timeout, pollFrequency) {
        // Use this.getAll()




    }

    /**
     * @return {Object} An object with all the default props to be fed into the constructor's definedProps
     * NOTE: definedProps are injected into the browser to be executed, so don't reference anything outside each function
     */
    static defaultProps() {
        return {
            'visible': [ (elems, input) => {
                return elems.filter(elem => {
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
            } ],

            'any visibility': [ (elems, input) => {
                return elems;
            } ],

            'enabled': [ (elems, input) => {
                return elems.filter(elem => !elem.getAttribute('disabled'));
            } ],

            'disabled': [ (elems, input) => {
                return elems.filter(elem => elem.getAttribute('disabled'));
            } ],

            'checked': [ (elems, input) => {






            } ],

            'unchecked': [ (elems, input) => {






            } ],

            'selected': [ (elems, input) => {






            } ],

            'focused': [ (elems, input) => {






            } ],

            'in focus': [ (elems, input) => {







            } ],

            'element': [ (elems, input) => {
                return elems;
            } ],

            'clickable': [ (elems, input) => {
                return elems.filter(elem => {
                    let tagName = element.tagName.toLowerCase();
                    return tagName == 'a' ||
                        tagName == 'button' ||
                        tagName == 'label' ||
                        tagName == 'input' ||
                        tagName == 'textarea' ||
                        tagName == 'select' ||
                        window.getComputedStyle(element).getPropertyValue('cursor') == 'pointer';
                        // TODO: handle cursor:pointer when hovered over
                });
            } ],

            'page title': [ (elems, input) => {






            } ],

            'page title contains': [ (elems, input) => {






            } ],

            'page url': [ (elems, input) => {
                // relative or absolute





            } ],

            'page url contains': [ (elems, input) => {
                // relative or absolute






            } ],

            'next to': [ (elems, input) => {
                // Find closest element by x,y coords to smallest element(s) containing the text? Or just use expanding containers?





            } ],

            'value': [ (elems, input) => {
                // elem.value only





            } ],

            'exact': [ (elems, input) => {






            } ],

            'contains': [ (elems, input) => {
                // Contained in innerText, value (including selected item in a select), placeholder, or associated label innerText
                // Containing, lower case, trimmed, and whitespace-to-single-space match





            } ],

            'innertext': [ (elems, input) => {





            } ],

            'selector': [ (elems, input) => {





            } ],

            'xpath': [ (elems, input) => {





            } ],

            'style': [ (elems, input) => {
                // input = 'name: val'




            } ],

            'has': [ (elems, input) => {
                // matches this selector or has a child that matches






            } ],

            // Same as an ord, returns nth elem, where n is 1-indexed
            'position': [ (elems, input) => {
                return elems[parseInt(input) - 1];
            } ]
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
