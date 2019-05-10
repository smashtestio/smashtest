const utils = require('../../utils.js');

class ElementFinder {
    /**
     * Constructs this EF, which represents a single line in an EF (and links to its child EFs)
     * @param {String} str - The string to parse, may contain multiple lines representing an element and its children
     * @param {Object} [definedProps] - An object containing a map of prop names to ElementFinders or functions
     * @param {Function} [logger] - The function used to log, takes in one parameter that is the string to log
     * @throws {Error} If there is a parse error
     */
    constructor(str, definedProps, logger) {
        this.counter = { min: 1, max: 1 };   // Counter associated with this EF, { min: N, max: M }, where both min and max are optional (if omitted, equivalent to { min: 1, max: 1 } )

        this.props = [];           // Array of Object representing the 'text', selectors, and properties of this EF
                                   // Each object in the array has the following format:
                                   //   { prop: 'full prop text', func: function from definedProps, input: 'input text if any', not: true or false }
                                   //       or
                                   //   { prop: 'full prop text', ef: ElementFinder object, not: true or false }
                                   //
                                   // 'text' is converted to the prop "contains 'text'"
                                   // a selector is converted to the prop "selector 'text'"

        this.ord = null;           // If an ord is associated with this EF, this will be set to the number representing the ord (1, 2, etc.)

        this.parent = null;        // The parent EF, null if this is the top EF
        this.children = [];        // Array of ElementFinder. The children of this EF.

        this.isElemArray = false;  // If true, this is an element array
        this.isAnyOrder = false;   // If true, this.children can be in any order
        this.isSubset = false;     // If true, this.children can be a subset of the children actually on the page. Only works when this.isArray is true.

        this.indents = 0;          // Number of indents to the right of the base indent (first line's indent) where this EF is at

        this.logger = logger;      // Logger function, called as logger(text to log)

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

        const COUNTER_REGEX = /([0-9]+)(\s*[\-\+](\s*[0-9]+)?)?\s*x\s+/;
        const ORD_REGEX = /([0-9]+)(st|nd|rd|th)/;
        const PROP_REGEX = /(((?<!(\\\\)*\\)('([^\\']|(\\\\)*\\.)*')|(?<!(\\\\)*\\)("([^\\"]|(\\\\)*\\.)*"))|[^\,])*/;

        // Figure out base indent
        let lines = str.split(/\n/).filter(line => line.trim() != '');
        let baseIndent = utils.numIndents(lines[0]);
        let currEF = null;

        lines.forEach((line, index) => {
            let filename = ''
            let lineNumber = index + 1;

            // Set currEF based on number of indents
            if(index == 0) {
                currEF = this;
            }
            else {
                let indents = utils.numIndents(line, filename, lineNumber) - baseIndent;
                if(indents == 0 && index != 0) {
                    utils.error(`ElementFinder cannot have more than one base element at indent 0`, filename, lineNumber);
                }
                else if(indents < 0) {
                    utils.error(`ElementFinder cannot have a line that's indented left of the first line`, filename, lineNumber);
                }
                else if(indents < currEF.indents) {

                }
                else if(indents == currEF.indents) {

                }
                else if(indents > currEF.indents) {

                }
                // else unreachable
            }

            // Element Array
            if(line[0] == '*') {
                currEF.isElemArray = true;
                line = line.substr(1); // drop the *
            }

            // Split into comma-separated items




            // TODO: don't forget properties that start with "not" (look at comments in constructor for how to store)




            

        });














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
        // TODO: visible only
        // TODO: Don't forget to log stuff via this.logger






    }
}
module.exports = ElementFinder;
