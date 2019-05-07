class ElementFinder {
    /**
     * Constructs this EF
     * @param {String} str - The string to parse
     * @param {Object} [definedProps] - An object containing a map of prop names to ElementFinders or functions
     * @param {Function} [logger] - The function used to log
     * @throws {Error} If there is a parse error
     */
    constructor(str, definedProps, logger) {
        this.counter = {};       // Counter associated with this EF, { low: N, high: M }, where both low and high are optional (if omitted, equivalent to { low: 1, high: 1 })

        this.props = [];         // Array of ElementFinder, function, or Object. Represents the properties of this EF. If "not" is applied to a property, it is stored as { not: ElementFinder or function }.
        this.children = [];      // Array of ElementFinder. The children of this EF.

        this.isArray = false;    // If true, this is an element array (*)
        this.isAnyOrder = false; // If true, this.children can be in any order
        this.isSubset = false;   // If true, this.children can be a subset of the children actually on the page. Only works when this.isArray is true.

        this.logger = logger;

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

        const COUNTER_REGEX = /([0-9]+)(\s*[\-\+](\s*[0-9]+)?)?/;
        const ORD_REGEX = /([0-9]+)(st|nd|rd|th)/;
        const STR_REGEX = /(?<!(\\\\)*\\)('([^\\']|(\\\\)*\\.)*')|(?<!(\\\\)*\\)("([^\\"]|(\\\\)*\\.)*")/;












        // TODO: don't forget properties that start with "not" (look at comments in constructor for how to store)

        return this;

        /**
         * @return {String} str but with leading/trailing whitespace and quotes removed
         */
        function stripQuotes(str) {
            return str.trim().replace(/^'|^"|'$|"$/g, '');
        }
    }

    /**
     * Finds the first visible element matching this EF
     * @param {Driver} driver - WebDriver object with which to look for this EF
     * @param {Element} [parentElem] - Only search at or inside this WebDriver Element, search anywhere on the page if omitted
     * @param {Element} [afterElem] - Only search after this WebDriver Element in the DOM, no restrictions if omitted
     * @param {Boolean} [isContinue] - How to set Error.continue, if an Error is thrown
     * @param {Number} [timeout] - Number of ms to continue trying before giving up. If omitted or set to 0, only try once before giving up.
     * @param {Number} [pollFrequency] - How often to poll for a matching element, in ms. If omitted, polls every 500 ms.
     * @return {Element} The WebDriver Element that was found
     * @throws {Error} If a matching element wasn't found in time, or if an element array (*) wasn't properly matched
     */
    async findElement(driver, parentElem, afterElem, isContinue, timeout, pollFrequency) {
        let elems = this.findElements(driver, parentElem, afterElem, isContinue, timeout, pollFrequency);
        if(elems.length == 0) {
            throw new Error(`Element not found${!timeout ? ' in time' : ''}`);
        }
        else {
            return elems[0];
        }
    }

    /**
     * Finds all visible elements matching this EF
     * Params same as in findElement()
     * @return {Array} Array of WebDriver Elements that were found, empty array if nothing found in time
     * @throws {Error} If an element array (*) wasn't properly matched
     */
    async findElements(driver, parentElem, afterElem, isContinue, timeout, pollFrequency) {
        // TODO: visible only
        // TODO: Don't forget to log stuff via this.logger






    }

    /**
     * Ensures that this EF is not visible or does not exist
     * Params same as in findElement()
     * @throws {Error} If this EF is still visible on the page after the timeout expires
     */
    async not(driver, parentElem, afterElem, isContinue, timeout, pollFrequency) {





    }
}
module.exports = ElementFinder;
