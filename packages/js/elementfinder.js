const utils = require('../../utils.js');

class ElementFinder {
    /**
     * Constructs this EF, which represents a single line in an EF (and links to its child EFs)
     * @param {String} str - The string to parse, may contain multiple lines representing an element and its children
     * @param {ElementFinder} [parent] - The ElementFinder that's the parent of this one, none if ommitted
     * @param {Object} [definedProps] - An object containing a map of prop names to ElementFinders or functions
     * @param {Function} [logger] - The function used to log, takes in one parameter that is the string to log
     * @param {Number} [lineNumberOffset] - Offset line numbers by this amount (if this EF has a parent), 0 if omitted
     * @throws {Error} If there is a parse error
     */
    constructor(str, parent, definedProps, logger, lineNumberOffset) {
        this.counter = { min: 1, max: 1 };   // Counter associated with this EF, { min: N, max: M }, where both min and max are optional (if omitted, equivalent to { min: 1, max: 1 } )

        this.props = [];           // Array of Object representing the props of this EF (i.e., 'text', selector, defined props)
                                   // Each object in the array has the following format:
                                   //   { prop: 'full prop text', func: function from definedProps, input: 'input text if any', not: true or false }
                                   //       or
                                   //   { prop: 'full prop text', ef: ElementFinder object, not: true or false }
                                   //
                                   // 'text' is converted to the prop "contains 'text'"
                                   // a selector is converted to the prop "selector 'text'"

        this.ord = null;           // If an ord is associated with this EF, this will be set to the number representing the ord (1, 2, etc.)

        this.parent = parent;      // Parent EF, null if none
        this.children = [];        // Array of ElementFinder. The children of this EF.

        this.isElemArray = false;  // If true, this is an element array
        this.isAnyOrder = false;   // If true, this.children can be in any order
        this.isSubset = false;     // If true, this.children can be a subset of the children actually on the page. Only works when this.isArray is true.

        this.logger = logger;
        this.lineNumberOffset = lineNumberOffset || 0;

        // Parse str into this EF
        this.parseIn(str, definedProps);
    }

    /**
     * Parses the given string into this EF
     * Same params as in constructor
     * @return This object
     * @throws {Error} If there is a parse error
     */
    parseIn(str, definedProps) {
        if(!str || !str.trim()) {
            throw new Error(`Cannot create an empty ElementFinder`);
        }

        // Set lines, figure out base indent
        let lines = str.split(/\n/);
        let parentLine = null;
        let parentLineNumber = null;

        let i = 0;
        for(; i < lines.length; i++) {
            let line = lines[i];
            if(line.trim() != 0) {
                parentLine = line;
                parentLineNumber = i + 1;
                break;
            }
        }

        let baseIndent = utils.numIndents(parentLine);
        let filename = '';

        // Split into children
        let childStrs = [];
        for(; i < lines.length; i++) {
            let line = lines[i];
            let lineNumber = i + this.lineNumberOffset + 1;

            if(line.trim() == 0) {
                continue;
            }

            let indents = utils.numIndents(line, filename, lineNumber) - baseIndent;

            if(indents < 0) {
                utils.error(`ElementFinder cannot have a line that's indented left of the first line`, filename, lineNumber);
            }
            else if(indents == 0) {
                utils.error(`ElementFinder cannot have more than one line at indent 0`, filename, lineNumber);
            }
            else if(indents == 1) {
                childStrs.push(line); // a new child is formed
            }
            else { // indents > 1
                if(childStrs.length == 0) {
                    utils.error(`ElementFinder cannot have a line that's indented more than once compared to the line above`, filename, lineNumber);
                }

                childStrs[childStrs.length - 1] += `\n${line}`; // string goes onto the end of the last child
            }
        }

        childStrs.forEach(str => {
            this.children.push(new ElementFinder(str, this, definedProps, logger, i + this.lineNumberOffset));
        });

        // Parse parentLine

        const COUNTER_REGEX = /^([0-9]+)(\s*([\-\+])(\s*([0-9]+))?)?\s*x\s+/;
        const ORD_REGEX = /([0-9]+)(st|nd|rd|th)/;
        const PROP_REGEX = /(((?<!(\\\\)*\\)('([^\\']|(\\\\)*\\.)*')|(?<!(\\\\)*\\)("([^\\"]|(\\\\)*\\.)*"))|[^\,])*/g;

        // Element Array
        if(parentLine[0] == '*') {
            this.isElemArray = true;
            parentLine = parentLine.substr(1).trim(); // drop the *
        }
        else {
            // Is parentLine a keyword or does it start with a counter?
            parentLine = parentLine.trim();
            if(parentLine == 'any order') {
                if(this.parent) {
                    this.parent.isAnyOrder = true;
                }
                else {
                    utils.error(`The 'any order' keyword must have a parent element`, filename, parentLineNumber);
                }
            }
            else if(parentLine == 'subset') {
                if(this.parent) {
                    this.parent.isSubset = true;
                }
                else {
                    utils.error(`The 'subset' keyword must have a parent element`, filename, parentLineNumber);
                }
            }
            else {
                // Check for counter
                let matches = parentLine.match(COUNTER_REGEX);
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
                let props = parentLine.match(PROP_REGEX);

                props.forEach(prop => {
                    parentLine = parentLine.trim();
                    
                    // TODO: don't forget properties that start with "not" (look at comments in constructor for how to store)
                    // TODO: look for ords
                    // TODO: if it doesn't match anything in definedProps, it's a css selector
                    // TODO: set this.props









                });




            }
        }

        return this;
    }

    /**
     * Finds the first visible element matching this EF
     * @param {Driver} driver - WebDriver object with which to look for this EF
     * @param {Element} [parentElem] - Only search at or inside this WebDriver Element, search anywhere on the page if omitted
     * @param {Element} [afterElem] - Only search after this WebDriver Element in the DOM, no restrictions if omitted
     * @param {Boolean} [isContinue] - How to set Error.continue, if an Error is thrown
     * @param {Number} [timeout] - Number of ms to continue trying before giving up. If omitted or set to 0, only try once before giving up.
     * @param {Number} [pollFrequency] - How often to poll for a matching element, in ms. If omitted, polls every 500 ms.
     * @return {Promise} Promise that resolves to the WebDriver Element that was found
     * @throws {Error} If a matching element wasn't found in time, or if an element array wasn't properly matched
     */
    async find(driver, parentElem, afterElem, isContinue, timeout, pollFrequency) {
        // TODO: poll and enforce timeout



        /*
        let elems = this.findElements(driver, parentElem, afterElem, isContinue, timeout, pollFrequency);
        if(elems.length == 0) {
            throw new Error(`Element not found${!timeout ? ' in time' : ''}`);
        }
        else {
            return elems[0];
        }
        */







    }

    /**
     * Finds all visible elements matching this EF
     * Params same as in find()
     * @return {Promise} Promise that resolves to Array of WebDriver Elements that were found, empty array if nothing found in time
     * @throws {Error} If an element array wasn't properly matched
     */
    async findAll(driver, parentElem, afterElem, isContinue, timeout, pollFrequency) {
        // TODO: visible only
        // TODO: Don't forget to log stuff via this.logger






    }

    /**
     * Ensures that this EF is not visible or does not exist
     * Params same as in find()
     * @throws {Error} If this EF is still visible on the page after the timeout expires
     */
    async not(driver, parentElem, afterElem, isContinue, timeout, pollFrequency) {





    }

    /**
     * Finds all visible elements matching this EF at the current moment in time
     * Params same as in find()
     * @return {Promise} Promise that resolves to Array of WebDriver Elements that were found, empty array if nothing found
     * @throws {Error} If an element array wasn't properly matched
     */
    async getAll(driver, parentElem, afterElem) {
        // TODO: inject js that does all the work
        // TODO: visible only
        // TODO: Don't forget to log stuff via this.logger






    }
}
module.exports = ElementFinder;
