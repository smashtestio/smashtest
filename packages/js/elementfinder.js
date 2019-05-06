class ElementFinder {
    /**
     * Constructs this EF
     * @param {String} [str] - The string to parse, leading '[' and ']' or '[[' and ']]' are optional
     * @param {Object} [definedProps] - An object containing a map of prop names to strings or functions
     * @param {Function} [logger] - The function used to log
     * @throws {Error} If there is a parse error
     */
    constructor(str, definedProps, logger) {
        this.counter = {};      // Counter associated with this EF, { low: N, high: M }, where both low and high are optional (if omitted, equivalent to { low: 1, high: 1 })
        this.isArray = false;   // If true, this is a [[ ]], otherwise this is a [ ]
        this.props = [];        // Array of string or function, the properties of this EF (includes modifiers such as "any order" and "subset"). If "not" is applied to this property, it is stored as { not: string or function }.
        this.children = [];     // Array of ElementFinder, the children of this EF

        this.logger = logger;

        if(str) {
            this.parseIn(str, definedProps);
        }
    }

    /**
     * Parses the given string into this EF
     * Same params as in constructor
     * @return This object
     * @throws {Error} If there is a parse error
     */
    parseIn(str, definedProps) {
        str = str.trim().replace(/^\[|\]$/, ''); // trim and remove leading [] (if present)
        let arr = explode(str);

        const COUNTER_REGEX = /([0-9]+)(\s*[\-\+](\s*[0-9]+)?)?/;
        const ORD_REGEX = /([0-9]+)(st|nd|rd|th)/;
        const STR_REGEX = /(?<!(\\\\)*\\)('([^\\']|(\\\\)*\\.)*')|(?<!(\\\\)*\\)("([^\\"]|(\\\\)*\\.)*")/;


        // TODO: mark strings in array of index ranges, then loop in search of , \n [ while ignoring chars in those ranges










        // TODO: don't forget properties that start with "not" (look at comments in constructor for how to store)

        return this;

        /**
         * @return {Array of String} str divided up into props and []'s
         */
        function explode(str) {
            let arr = [];
            let currStr = '';

            let bracketCount = 0;
            for(let i = 0; i < str.length; i++) {
                let c = str[i];
                if(bracketCount > 0) {
                    currStr += c;


                }
                else if(c == ',' || c == '\n') {
                    pushCurrStr();
                }
                else {
                    currStr += c;

                    if(c == '[') {
                        bracketCount++;
                    }
                }
            }

            pushCurrStr();
            return arr.map(s => s.trim());

            function pushCurrStr() {
                if(currStr.trim() != '') {
                    arr.push(currStr);
                    currStr = '';
                }
            }
        }

        /**
         * @return {Boolean} True if the number of ['s and ]'s are the same in str, false otherwise
         */
        function bracketsBalanced(str) {
            return (str.match(/\[/) || []).length == (str.match(/\]/) || []).length;
        }

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
     * @param {Number} [timeout] - Number of ms to continue trying before giving up. If omitted, only try once before giving up.
     * @param {Number} [pollFrequency] - How often to poll for a matching element, in ms. If omitted, polls every 500 ms.
     * @return {Element} The WebDriver Element that was found
     * @throws {Error} If a matching element wasn't found in time, or if a [[ ]] wasn't properly matched
     */
    async findElement(driver, parentElem, afterElem, timeout, pollFrequency) {
        let elems = this.findElements(driver, parentElem, timeout, pollFrequency);
        if(elems.length == 0) {
            throw new Error("Element not found");
        }
        else {
            return elems[0];
        }
    }

    /**
     * Finds all visible elements matching this EF
     * Params same as in findElement()
     * @return {Array} Array of WebDriver Elements that were found, empty array if nothing found in time
     * @throws {Error} If a [[ ]] wasn't properly matched
     */
    async findElements(driver, parentElem, afterElem, timeout, pollFrequency) {
        // TODO: visible only
        // TODO: Don't forget to log stuff via this.logger






    }

    /**
     * Ensures that this EF is not visible or does not exist
     * Params same as in findElement()
     * @throws {Error} If this EF is still visible on the page after the timeout expires
     */
    async not(driver, parentElem, afterElem, timeout, pollFrequency) {





    }
}
module.exports = ElementFinder;
