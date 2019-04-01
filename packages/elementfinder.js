exports.ElementFinders = {
    ElementFinder: class ElementFinder {
        constructor() {
            this.ordinal = "";      // the ordinal portion, e.g., 1st from [1st 'Login' box next to 'Welcome']
            this.text = "";         // the text portion, e.g., Login from [1st 'Login' box next to 'Welcome']
            this.variable = "";     // the variable portion, e.g., box from [1st 'Login' box next to 'Welcome']
            this.selector = "";     // the variable portion replaced with the corresponding global var's value (which should contain the selector)
            this.nextTo = "";       // the next to portion, e.g., Welcome from [1st 'Login' box next to 'Welcome']
        }
    },

    // Matches an [ElementFinder] in this format:
    // [ OPTIONAL(1st/2nd/3rd/etc.)   MANDATORY('TEXT' AND/OR VAR-NAME)   OPTIONAL(next to 'TEXT') ]
    REGEX: /(?<!(\\\\)*\\)\[\s*(([0-9]+)(st|nd|rd|th))?\s*(('[^']+?'|"[^"]+?")|([^"']+?)|(('[^']+?'|"[^"]+?")\s+([^"']+?)))\s*(next\s+to\s+('[^']+?'|"[^"]+?"))?\s*\]/g,

    // Same as ELEMENTFINDER, only matches the whole line
    REGEX_WHOLE = new RegExp("^\\s*" + this.REGEX.source + "\\s*$"),

    /**
     * @return {String} str but with leading/trailing whitespace and quotes removed
     */
    stripQuotes: function(str) {
        return str.trim().replace(/^'|^"|'$|"$/g, '');
    },

    /**
     * Parses text inside brackets into an ElementFinder
     * @param {String} text - The text to parse, with the brackets ([])
     * @return {ElementFinder} The ElementFinder, or null if this is not a valid ElementFinder
     */
    parseElementFinder: function(name) {
        let matches = name.match(this.REGEX_WHOLE);
        if(matches) {
            let ordinal = (matches[3] || '');
            let text = this.stripQuotes((matches[6] || '') + (matches[9] || '')); // it's either matches[6] or matches[9]
            let variable = ((matches[7] || '') + (matches[10] || '')).trim(); // it's either matches[7] or matches[10]
            let nextTo = this.stripQuotes(matches[12] || '');

            if(!text && !variable) { // either the text and/or the variable must be present
                return null;
            }
            if(nextTo && !ordinal && !text && !variable) { // next to cannot be listed alone
                return null; // NOTE: probably unreachable because a "next to" by itself won't get matched by the regex
            }

            let ef = new this.ElementFinder();

            if(ordinal) {
                ef.ordinal = parseInt(ordinal);
            }
            if(text) {
                ef.text = text;
            }
            if(variable) {
                ef.variable = variable;
                ef.selector = runInstance.findVarValue(variable, false, runInstance.currStep, runInstance.currBranch);
            }
            if(nextTo) {
                ef.nextTo = nextTo;
            }

            return ef;
        }
        else {
            return null;
        }
    }
};
