class ElementFinder {
    /**
     * Constructs this EF
     * @param {String} [str] - The string to parse, must start with '[' and end with ']'
     * @param {Object} [definedProps] - An object containing a map of prop names to strings or functions
     * @throws {Error} If there is a parse error
     */
    constructor(str, definedProps) {
        this.counter = {};      // Counter associated with this EF, { low: N, high: M }, where both low and high are optional (if omitted, equivalent to { low: 1, high: 1 })
        this.isArray = false;   // If true, this is a [[ ]], otherwise this is a [ ]
        this.props = [];        // Array of string or function, the properties of this EF (includes modifiers such as "any order" and "subset")
        this.children = [];     // Array of ElementFinder, the children of this EF

        if(str) {
            this.parseIn(str, definedProps);
        }
    }

    /**
     * Parses the given string into this EF
     * @param {String} str - The string to parse, must start with '[' and end with ']'
     * @param {Object} [definedProps] - An object containing a map of prop names to strings or functions
     * @throws {Error} If there is a parse error
     */
    parseIn(str, definedProps) {










        const ORD_REGEX = /([0-9]+)(st|nd|rd|th)/;



    }

    /**
     * Finds the first element matching this EF
     * @param {SeleniumBrowser} browser - Browser with which to look for this EF
     * @param {Number} [timeout] - Number of ms to continue trying before giving up. If omitted, only try once before giving up.
     * @param {Number} [pollFrequency] - How often to poll for a matching element, in ms. If omitted, polls every 500 ms.
     * @throws {Error} If a matching element wasn't found, or if a [[ ]] wasn't matched exactly
     */
    findElement(browser, timeout, pollFrequency) {
        let elems = this.findElements(browser, timeout, pollFrequency);
        if(elems.length == 0) {
            throw new Error("Element not found");
        }
    }

    /**
     * Finds all the elements matching this EF
     * @param {SeleniumBrowser} browser - Browser with which to look for this EF
     * @param {Number} [timeout] - Number of ms to continue trying before giving up. If omitted, only try once before giving up.
     * @param {Number} [pollFrequency] - How often to poll for a matching element, in ms. If omitted, polls every 500 ms.
     * @throws {Error} If a [[ ]] wasn't matched exactly
     */
    findElements(browser, timeout, pollFrequency) {








    }

    /**
     * @return {String} str but with leading/trailing whitespace and quotes removed
     */
    stripQuotes(str) {
        return str.trim().replace(/^'|^"|'$|"$/g, '');
    }
}
module.exports = ElementFinder;
