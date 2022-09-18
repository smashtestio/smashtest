import { WebDriver, WebElement } from 'selenium-webdriver';
import invariant from 'tiny-invariant';
import * as Constants from '../../core/constants.js';
import { BrowserElementFinder, ElementFinderPayload, PropDefinition, Props } from '../../core/types.js';
import * as utils from '../../core/utils.js';
import { browserFunction } from './elementfinder-browser.js';

class ElementFinder {
    line = ''; // The full line representing this EF

    counter: {
        min: number;
        max?: number;
        default?: boolean;
    } = { min: 1, max: 1, default: true }; // Counter associated with this EF, { min: N, max: M }, where both min and max are optional (if omitted, equivalent to { min: 1, max: 1 } )

    // Array of Object representing the props of this EF (i.e., 'text', selector, defined props)
    // A prop of just `'text'` is converted to the prop `contains 'text'`
    // A css selector is converted to the prop `selector 'text'`
    // An ord is converted to the prop `position 'N'`
    props: PropDefinition[] = [];

    parent; // Parent EF, if one exists
    children: ElementFinder[] = []; // Array of ElementFinder. The children of this EF.

    // OPTIONAL
    matchMe?: boolean; // If true, this is an [element] (enclosed in brackets)
    isElemArray?: boolean; // If true, this is an element array
    isAnyOrder?: boolean; // If true, this.children can be in any order

    usedDefinedProps;
    logger?;

    fullStr?: string; // The full string representing the top EF and its children. Only set this for the top parent EF.

    empty?: boolean;

    // SET INSIDE BROWSER

    error?: string | true; // Set to an error string if there was an error finding this EF, set to true if there's an error on a child
    blockErrors?: { header: string; body: string }[]; // Set to an array of objs { header: '', body: '' } representing errors to be rendered as blocks

    matchedElems?: Element[]; // DOM Elements or WebElements that match this EF
    matchMeElems?: Element[]; // DOM Elements or WebElements that match [bracked lines] inside this EF. Use this instead of matchedElems if it has > 0 elements inside.

    static browserConsoleOutput = false;

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
    constructor(
        str: string,
        definedProps?: Props,
        usedDefinedProps: Props = {},
        logger?: (str: string) => void,
        parent?: ElementFinder,
        lineNumberOffset?: number,
        noParse?: boolean
    ) {
        this.parent = parent;
        this.usedDefinedProps = usedDefinedProps;

        if (logger) {
            this.logger = logger;
        }

        // Parse str into this EF
        if (!noParse) {
            this.parseIn(
                str,
                definedProps || ElementFinder.defaultProps(),
                this.usedDefinedProps,
                lineNumberOffset || 0
            );
        }
    }

    /**
     * Parses the given string into this EF
     * Same params as in constructor, but all params are mandatory
     * @return This object
     * @throws {Error} If there is a parse error
     */
    parseIn(str: string | undefined, definedProps: Props, usedDefinedProps: Props, lineNumberOffset: number) {
        /**
         * @return {Boolean} True if s matches one of the prop patterns (ord, 'text', or defined prop with no input), false otherwise
         */
        function isValidPattern(str: string) {
            return (
                str.match(Constants.ORD_REGEX) ||
                str.match(Constants.QUOTED_STRING_LITERAL_WHOLE) ||
                (Object.prototype.hasOwnProperty.call(definedProps, ElementFinder.canonicalizePropStr(str)[0]) &&
                    !str.match(Constants.QUOTED_STRING_LITERAL)) // we don't accept `prop 'with input'` in a space-separated list
            );
        }

        if (!str || !str.trim()) {
            throw new Error('Cannot create an empty ElementFinder');
        }

        let lines = str.split(/\n/);

        // Strip out // comments
        for (let k = 0; k < lines.length; k++) {
            let line = lines[k];
            line = line.replace(Constants.QUOTED_STRING_LITERAL, ''); // remove strings, since a // inside a string doesn't count
            const matches = line.match(/\/\/.*$/);
            if (matches) {
                lines[k] = line.replace(matches[0], '');
            }
        }

        // Find parent line
        let parentLine = null;
        let parentLineNumber = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim() !== '') {
                parentLine = line;
                parentLineNumber = i + 1;
                break;
            }
        }

        invariant(
            typeof parentLine === 'string' && typeof parentLineNumber === 'number',
            'Couldn\'t find parent line in ElementFinder'
        );

        const filename = 'line';
        const baseIndent = utils.numIndents(parentLine, filename, parentLineNumber);

        // If there is more than one line at baseIndent, make this a body EF and all of str will be its children
        for (let i = parentLineNumber; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim() != '') {
                const indents = utils.numIndents(line, filename, i + 1);
                if (indents == baseIndent) {
                    const spaces = utils.getIndents(1);
                    lines = lines.map((line) => spaces + line);

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
        if (parentLine[0] == '*') {
            // Element Array
            this.isElemArray = true;
            this.counter = { min: 0 };
            parentLine = parentLine.substr(1).trim(); // drop the *

            if (this.parent && this.parent.isElemArray) {
                utils.error(
                    'Cannot have element array inside element array',
                    filename,
                    parentLineNumber + lineNumberOffset
                );
            }
        }

        if (parentLine === 'any order' && !this.isElemArray) {
            // 'any order' keyword
            if (this.parent) {
                this.parent.isAnyOrder = true;
                this.empty = true;
            }
            else {
                utils.error(
                    'The \'any order\' keyword must have a parent element',
                    filename,
                    parentLineNumber + lineNumberOffset
                );
            }
        }
        else {
            // Check for [element]
            let matches = parentLine.match(/^\[(.*)\]$/);
            if (matches) {
                this.matchMe = true;
                parentLine = matches[1].trim();
            }

            // Check for counter
            const COUNTER_REGEX = /^([0-9]+)(\s*([-+])(\s*([0-9]+))?)?\s*x\s+/;
            matches = parentLine.match(COUNTER_REGEX);
            if (matches) {
                if (this.isElemArray) {
                    utils.error(
                        'An element array is not allowed to have a counter',
                        filename,
                        parentLineNumber + lineNumberOffset
                    );
                }

                parentLine = parentLine.replace(COUNTER_REGEX, ''); // remove counter

                const min = matches[1];
                const middle = matches[3];
                const max = matches[5];

                if (middle === '-') {
                    if (max === undefined) {
                        // N-
                        this.counter = { min: parseInt(min) };
                    }
                    else {
                        // N-M
                        this.counter = { min: parseInt(min), max: parseInt(max) };
                    }
                }
                else if (middle == '+') {
                    // N+
                    this.counter = { min: parseInt(min) };
                }
                else {
                    // N
                    this.counter = { min: parseInt(min), max: parseInt(min) };
                }

                if (this.counter.max < this.counter.min) {
                    utils.error(
                        'A counter\'s max cannot be less than its min',
                        filename,
                        parentLineNumber + lineNumberOffset
                    );
                }
            }

            // Split into comma-separated props
            const propStrs = parentLine.match(Constants.PROP_REGEX_COMMAS).filter((propStr) => propStr.trim() != '');
            let implicitVisible = true;

            for (let i = 0; i < propStrs.length; i++) {
                let propStr = propStrs[i].trim();
                let canonPropStr = null;
                let input = null;
                let matches = null;

                // not keyword
                let isNot = false;
                if (propStr.match(/^not /)) {
                    propStr = propStr.replace(/^not /, '').trim();
                    isNot = true;
                }

                // Decide which pattern propStr matches
                // eslint-disable-next-line no-cond-assign
                if ((matches = propStr.match(Constants.ORD_REGEX))) {
                    // propStr is an ord (convert to `position 'N'`)
                    canonPropStr = 'position';
                    input = parseInt(matches[1]);
                }
                // eslint-disable-next-line no-cond-assign
                else if ((matches = propStr.match(Constants.QUOTED_STRING_LITERAL_WHOLE))) {
                    // propStr is 'text' (convert to `contains 'text'`)
                    canonPropStr = 'contains';
                    input = utils.unescape(utils.stripQuotes(propStr));
                }
                else if (
                    Object.prototype.hasOwnProperty.call(definedProps, ElementFinder.canonicalizePropStr(propStr)[0])
                ) {
                    // propStr is a defined prop
                    // do nothing
                }
                else {
                    // propStr doesn't match any pattern
                    // Check if it's possible to further subdivide propStr by spaces into special format [ord]? [defined prop OR text]+

                    let isSpecialFormat = true;
                    const spaceSeparatedPropStrs = [];

                    matches = propStr.match(Constants.PROP_REGEX_SPACES)?.filter((s) => s.trim() !== '');

                    if (matches && matches.length >= 2) {
                        outside: for (let j = 0; j < matches.length; j++) {
                            for (let len = matches.length - j; len > 0; len--) {
                                const possibleProp = matches.slice(j, j + len).join(' ');
                                if (isValidPattern(possibleProp)) {
                                    spaceSeparatedPropStrs.push(possibleProp);
                                    j += len - 1;
                                    break;
                                }
                                else if (len == 1) {
                                    isSpecialFormat = false;
                                    break outside;
                                }
                            }
                        }
                    }
                    else {
                        isSpecialFormat = false;
                    }

                    if (isSpecialFormat) {
                        // Put ord in back, if there is one
                        if (spaceSeparatedPropStrs[0].match(Constants.ORD_REGEX)) {
                            spaceSeparatedPropStrs.push(spaceSeparatedPropStrs[0]);
                            spaceSeparatedPropStrs.shift();
                        }

                        propStrs.splice(i, 1, ...spaceSeparatedPropStrs); // replace current propStr with all the space-separated props
                        i--;
                        continue;
                    }
                    else {
                        // propStr is a css selector (convert to `selector 'selector'`)
                        canonPropStr = 'selector';
                        input = propStr;
                    }
                }

                // Set prop based on the correct entry in definedProps

                if (!canonPropStr) {
                    // if it hasn't been set yet
                    [canonPropStr, input] = ElementFinder.canonicalizePropStr(propStr);
                }

                if (Object.prototype.hasOwnProperty.call(definedProps, canonPropStr)) {
                    this.addProp((isNot ? 'not ' : '') + propStr, canonPropStr, input, isNot, definedProps);

                    if (['visible', 'any visibility'].indexOf(canonPropStr) !== -1) {
                        implicitVisible = false;
                    }
                }
                else {
                    // rare case (usually if someone explicitly overrides the selector prop)
                    utils.error(
                        `Cannot find property that matches \`${canonPropStr}\``,
                        filename,
                        parentLineNumber + lineNumberOffset
                    );
                }
            }

            // Apply the 'visible' property, except if 'visible', 'not visible', or 'any visibility' was explicitly listed
            if (implicitVisible) {
                this.addProp('visible', 'visible', undefined, undefined, definedProps, true);
            }
        }

        // Parse children
        const childObjs = [];
        for (let i = parentLineNumber; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1 + lineNumberOffset;

            if (line.trim() == '') {
                if (childObjs.length != 0) {
                    childObjs[childObjs.length - 1].str += `\n${line}`; // goes onto the end of the last child
                }

                continue;
            }

            const indents = utils.numIndents(line, filename, lineNumber) - baseIndent;

            if (indents < 0) {
                utils.error(
                    'ElementFinder cannot have a line that\'s indented left of the first line',
                    filename,
                    lineNumber
                );
            }
            else if (indents == 1) {
                childObjs.push({ str: line, lineNumber: lineNumber }); // a new child is formed
            }
            else {
                // indents > 1
                if (childObjs.length == 0) {
                    utils.error(
                        'ElementFinder cannot have a line that\'s indented more than once compared to the line above',
                        filename,
                        lineNumber
                    );
                }

                childObjs[childObjs.length - 1].str += `\n${line}`; // string goes onto the end of the last child
            }
            // NOTE: indents == 0 shouldn't occur
        }

        childObjs.forEach((c) => {
            const childEF = new ElementFinder(
                c.str,
                definedProps,
                usedDefinedProps,
                this.logger,
                this,
                c.lineNumber + lineNumberOffset - 1
            );
            if (!childEF.empty) {
                this.children.push(childEF);
            }
        });

        return this;
    }

    /**
     * Includes the given prop in this EF
     * @param {String} prop - The full string of the prop
     * @param {String} def - The name the prop (not including any inputs)
     * @param {String} [input] - The input string of this prop, if any
     * @param {Boolean} [isNot] - If true, there's a "not" at the beginning of this prop
     * @param {Array} definedProps - The defined props, see the return of defaultProps() below
     * @param {Boolean} [toFront] - If true, append the prop to the front of this.props (as opposed to the back)
     */
    addProp(
        prop: string,
        def: string,
        input: string | undefined,
        isNot: boolean,
        definedProps: Props,
        toFront?: boolean
    ) {
        const addToUsedDefinedProps = (def: string) => {
            if (!Object.prototype.hasOwnProperty.call(this.usedDefinedProps, def)) {
                this.usedDefinedProps[def] = definedProps[def];
                this.usedDefinedProps[def].forEach((d) => {
                    if (d instanceof ElementFinder) {
                        addEF(d);
                    }
                });
            }
        };

        function addEF(ef: ElementFinder) {
            ef.props.forEach((prop) => addToUsedDefinedProps(prop.def));
            ef.children.forEach((child) => addEF(child));
        }

        const propObj: PropDefinition = {
            prop: prop,
            def: def
        };

        if (input !== undefined) {
            propObj.input = input;
        }

        if (isNot) {
            propObj.not = true;
        }

        if (toFront) {
            this.props.unshift(propObj);
        }
        else {
            this.props.push(propObj);
        }

        addToUsedDefinedProps(def);
    }

    /**
     * Parses a plain object in the form of an ElementFinder and converts it into an ElementFinder object
     * Handles all children as well
     * @param {Object} efResult - The plain object to convert
     * @return {ElementFinder} The EF derived from obj
     */
    static parseObj(efResult: ReturnType<typeof browserFunction>['ef']) {
        const ef = new ElementFinder(undefined, undefined, undefined, undefined, undefined, undefined, true);
        Object.assign(ef, efResult, {
            children: efResult.children.map((c) => ElementFinder.parseObj(c))
        });
        return ef;
    }

    /**
     * @param {String} [errorStart] - String to mark the start of an error, '-->' if omitted
     * @param {String} [errorEnd] - String to mark the end of an error, '' if omitted
     * @param {Number} [indents] - The number of indents at this value, 0 if omitted
     * @return {String} A prettified version of this EF and its children, including errors
     */
    print(errorStart?: string, errorEnd?: string, indents?: number) {
        indents = indents || 0;
        const errorStartStr = errorStart || '-->';
        const errorEndStr = errorEnd || '';

        const spaces = utils.getIndents(indents);
        const nextSpaces = utils.getIndents(indents + 1);

        let error = '';
        if (this.error && this.error !== true) {
            error = `  ${errorStartStr}  ${this.error}${errorEndStr}`;
        }

        let blockErrors = '';
        if (this.blockErrors) {
            this.blockErrors.forEach((blockError) => {
                blockErrors +=
                    '\n' +
                    nextSpaces +
                    errorStartStr +
                    ' ' +
                    blockError.header +
                    '\n' +
                    nextSpaces +
                    blockError.body +
                    errorEndStr +
                    '\n';
            });
        }
        if (blockErrors) {
            blockErrors = '\n' + blockErrors;
        }

        let children = '';
        if (this.isAnyOrder) {
            children += '\n' + nextSpaces + 'any order';
        }
        if (this.children.length > 0) {
            children += '\n';
            for (let i = 0; i < this.children.length; i++) {
                children +=
                    this.children[i].print(errorStart, errorEnd, indents + 1) +
                    (i < this.children.length - 1 ? '\n' : '');
            }
        }

        return spaces + this.line + error + children + blockErrors;
    }

    /**
     * @return {Boolean} True if this EF or one of its descendants has an error or block error, false otherwise
     */
    hasErrors() {
        if (this.error || (this.blockErrors && this.blockErrors.length > 0)) {
            return true;
        }

        for (const child of this.children) {
            if (child.hasErrors()) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return {Object} An object representing this EF and its children, ready to be fed into JSON.stringify()
     */
    serialize(): BrowserElementFinder {
        return {
            line: this.line,
            counter: this.counter,
            props: this.props,
            children: this.children.map((child) => child.serialize()),
            matchMe: this.matchMe,
            isElemArray: this.isElemArray,
            isAnyOrder: this.isAnyOrder,
            ...(!this.parent ? { fullStr: this.print() } : {})
        };
    }

    /**
     * @return {String} JSON representation of this EF, its children, and used defined props
     * Functions are converted to strings
     */
    serializeJSON() {
        const payload: ElementFinderPayload = {
            ef: this.serialize(),
            definedProps: this.usedDefinedProps
            // definedProps: mapValues(this.usedDefinedProps, ([fn]) => [fn.toString()] as const)
        };

        // return JSON.stringify(payload);

        return JSON.stringify(payload, (k, v) => {
            if (typeof v === 'function') {
                return v.toString();
            }
            else if (v instanceof ElementFinder) {
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
    async getAll(driver: WebDriver, parentElem: WebElement) {
        const result = await driver.executeScript<ReturnType<typeof browserFunction>>(
            utils.es5(browserFunction),
            this.serializeJSON(),
            parentElem,
            ElementFinder.browserConsoleOutput
        );

        return {
            ef: ElementFinder.parseObj(result.ef),
            matches: result.matches || []
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
    find(
        driver: WebDriver,
        parentElem: WebElement,
        isNot: boolean,
        isContinue: boolean,
        $timeout?: number,
        $pollFrequency?: number
    ) {
        const timeout = $timeout ?? 0;
        const pollFrequency = $pollFrequency ?? 500;

        const start = new Date();
        let results;

        return new Promise((resolve, reject) => {
            const doFind = async () => {
                results = await this.getAll(driver, parentElem);

                if (!isNot ? results.ef.hasErrors() : results.matches && results.matches.length > 0) {
                    const duration = Number(new Date()) - Number(start);
                    if (duration > timeout) {
                        const error = !isNot
                            ? new Error(
                                `Element${this.counter.max == 1 ? '' : 's'} not found${
                                    timeout > 0 ? ` in time (${timeout / 1000} s)` : ''
                                }:\n\n${results.ef.print(
                                    Constants.CONSOLE_END_COLOR + Constants.CONSOLE_START_RED + '-->',
                                    Constants.CONSOLE_END_COLOR + Constants.CONSOLE_START_GRAY
                                )}`
                            )
                            : new Error(
                                `Element${this.counter.max == 1 ? '' : 's'} still found${
                                    timeout > 0 ? ` after timeout (${timeout / 1000} s)` : ''
                                }`
                            );

                        if (isContinue) {
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
            };

            return doFind();
        });
    }

    /**
     * @return {Object} An object with all the default props to be fed into the constructor's definedProps
     * NOTE: definedProps are injected into the browser to be executed, so don't reference anything outside each function and
     * make sure all js features used will work in every browser supported
     */
    static defaultProps(): Props {
        return {
            visible: [
                utils.es5(function (elems) {
                    return elems.filter(function (elem) {
                        if (elem instanceof HTMLElement && (elem.offsetWidth === 0 || elem.offsetHeight === 0)) {
                            return false;
                        }

                        let cs = window.getComputedStyle(elem);

                        if (cs.visibility === 'hidden' || cs.visibility === 'collapse') {
                            return false;
                        }

                        if (cs.opacity === '0') {
                            return false;
                        }

                        // Check opacity of parents
                        let el = elem.parentElement;

                        while (el) {
                            cs = window.getComputedStyle(el);
                            if (cs.opacity === '0') {
                                return false;
                            }
                            el = el.parentElement;
                        }

                        return true;
                    });
                })
            ],

            'any visibility': [
                utils.es5(function (elems) {
                    return elems;
                })
            ],

            enabled: [
                utils.es5(function (elems) {
                    return elems.filter((elem) => elem.getAttribute('disabled') === null);
                })
            ],

            disabled: [
                utils.es5(function (elems) {
                    return elems.filter((elem) => elem.getAttribute('disabled') !== null);
                })
            ],

            checked: [
                utils.es5(function (elems) {
                    return elems.filter((elem) => elem instanceof HTMLInputElement && elem.checked);
                })
            ],

            unchecked: [
                utils.es5(function (elems) {
                    return elems.filter((elem) => elem instanceof HTMLInputElement && !elem.checked);
                })
            ],

            selected: [
                utils.es5(function (elems) {
                    return elems.filter((elem) => elem instanceof HTMLOptionElement && elem.selected);
                })
            ],

            focused: [
                utils.es5(function (elems) {
                    return elems.filter((elem) => elem === document.activeElement);
                })
            ],

            element: [
                utils.es5(function (elems) {
                    return elems;
                })
            ],

            clickable: [
                utils.es5(function (elems) {
                    return elems.filter(function (elem) {
                        const tagName = elem.tagName.toLowerCase();
                        return (
                            (tagName === 'a' ||
                                tagName === 'button' ||
                                tagName === 'label' ||
                                tagName === 'input' ||
                                tagName === 'textarea' ||
                                tagName === 'select' ||
                                tagName === 'option' ||
                                window.getComputedStyle(elem).getPropertyValue('cursor') === 'pointer') &&
                            !elem.disabled
                        );
                        // TODO: handle cursor:pointer when hovered over
                    });
                })
            ],

            'page title': [
                utils.es5(function (elems, input) {
                    return document.title == input ? elems : [];
                })
            ],

            'page title contains': [
                utils.es5(function (elems, input) {
                    if (input === undefined) return [];
                    return document.title.toLowerCase().indexOf(input.toLowerCase()) !== -1 ? elems : [];
                })
            ],

            'page url': [
                utils.es5(function (elems, input) {
                    if (input === undefined) return [];
                    // absolute or relative
                    return window.location.href === input ||
                        window.location.href.replace(/^https?:\/\/[^/]*/, '') === input
                        ? elems
                        : [];
                })
            ],

            'page url contains': [
                utils.es5(function (elems, input) {
                    if (input === undefined) return [];
                    return window.location.href.indexOf(input) !== -1 ? elems : [];
                })
            ],

            // Takes each elem and expands the container around it to its parent, parent's parent etc. until a container
            // containing input is found. Matches multiple elems if there's a tie.
            'next to': [
                utils.es5(function (elems, input) {
                    if (input === undefined) return [];

                    function canon(str?: string) {
                        return str ? str.trim().toLowerCase().replace(/\s+/g, ' ') : '';
                    }

                    function innerTextCanon(el: typeof elems[number]) {
                        return (el instanceof HTMLElement ? el.innerText : el.textContent) ?? '';
                    }

                    const $input = canon(input);

                    let containers = elems;
                    let atBody = false;

                    while (!atBody) {
                        // if a container reaches document.body and nothing is still found, input doesn't exist on the page
                        containers = containers.map(function (container) {
                            return container.parentElement ?? document.body;
                        });
                        containers.forEach(function (container) {
                            if (container === document.body) {
                                atBody = true;
                            }
                        });

                        const matchedElems: Element[] = [];

                        containers.forEach(function (container, index) {
                            if (canon(innerTextCanon(container)).indexOf($input) !== -1) {
                                matchedElems.push(elems[index]);
                            }
                        });

                        if (matchedElems.length > 0) {
                            return matchedElems;
                        }
                    }

                    return [];
                })
            ],

            value: [
                utils.es5(function (elems, input) {
                    // @ts-expect-error 'value' is present on a bunch of HTML
                    // elements, it's impossible to instanceof check for all of
                    // them
                    return elems.filter((elem) => elem.value === input);
                })
            ],

            // Text is contained in innerText, value (including selected item in a select), placeholder, or associated label innerText
            contains: [
                utils.es5(function (elems, input) {
                    if (input === undefined) return [];

                    function canon(str?: string) {
                        return str ? str.trim().toLowerCase().replace(/\s+/g, ' ') : '';
                    }

                    const $input = canon(input);

                    function innerTextCanon(el: typeof elems[number]) {
                        return (el instanceof HTMLElement ? el.innerText : el.textContent) ?? '';
                    }

                    function isMatch(str: string) {
                        return canon(str).indexOf($input) !== -1;
                    }

                    return elems.filter(function (elem: Element) {
                        const innerText = innerTextCanon(elem);
                        let labelText = '';
                        if (elem.id) {
                            let escape = function (str: string) {
                                return str;
                            };
                            if (CSS && CSS.escape) {
                                escape = CSS.escape;
                            }
                            const labelElem = document.querySelector('label[for="' + escape(elem.id) + '"]');
                            if (labelElem) {
                                labelText = labelElem.innerText;
                            }
                        }

                        let dropdownText = '';
                        if (elem.options && typeof elem.selectedIndex !== undefined && elem.selectedIndex !== null) {
                            dropdownText = elem.options[elem.selectedIndex].text;
                        }

                        if (elem.tagName.toLowerCase() === 'select') {
                            return isMatch(labelText) || isMatch(dropdownText);
                        }
                        else {
                            return (
                                isMatch(innerText) ||
                                // @ts-expect-error 'value' is present on a bunch of HTML element types
                                isMatch(elem.value) ||
                                ((elem instanceof HTMLInputElement || elem instanceof HTMLTextAreaElement) &&
                                    isMatch(elem.placeholder)) ||
                                isMatch(labelText) ||
                                isMatch(dropdownText)
                            );
                        }
                    });
                })
            ],

            // Text is the exclusive and exact text in innerText, value (including selected item in a select), placeholder, or associated label innerText
            'contains exact': [
                utils.es5(function (elems, input) {
                    if (input === undefined) return [];

                    function isMatch(str: string) {
                        return str === input;
                    }

                    function innerTextCanon(el: typeof elems[number]) {
                        return (el instanceof HTMLElement ? el.innerText : el.textContent) ?? '';
                    }

                    return elems.filter(function (elem) {
                        const innerText = innerTextCanon(elem);
                        let labelText = '';
                        let escape = function (str: string) {
                            return str;
                        };
                        if (CSS && CSS.escape) {
                            escape = CSS.escape;
                        }
                        const labelElem = document.querySelector('label[for="' + escape(elem.id) + '"]');
                        if (labelElem) {
                            labelText = labelElem.innerText;
                        }

                        let dropdownText = '';
                        if (elem.options && elem.selectedIndex !== undefined && elem.selectedIndex !== null) {
                            dropdownText = elem.options[elem.selectedIndex].text;
                        }

                        if (elem.tagName.toLowerCase() === 'select') {
                            return isMatch(labelText) || isMatch(dropdownText);
                        }
                        else {
                            return (
                                isMatch(innerText) ||
                                // @ts-expect-error 'value' is present on a bunch of HTML element types
                                isMatch(elem.value) ||
                                ((elem instanceof HTMLInputElement || elem instanceof HTMLTextAreaElement) &&
                                    isMatch(elem.placeholder)) ||
                                isMatch(labelText) ||
                                isMatch(dropdownText)
                            );
                        }
                    });
                })
            ],

            innertext: [
                utils.es5(function (elems, input) {
                    if (input === undefined) return [];

                    function innerTextCanon(el: typeof elems[number]) {
                        return (el instanceof HTMLElement ? el.innerText : el.textContent) ?? '';
                    }

                    return elems.filter(function (elem) {
                        return innerTextCanon(elem).indexOf(input) !== -1;
                    });
                })
            ],

            selector: [
                utils.es5(function (elems, input) {
                    if (input === undefined) return [];

                    let nodes = null;
                    try {
                        nodes = document.querySelectorAll(input);
                    }
                    catch (e) {
                        return [];
                    }

                    const nodesArr = [];
                    for (let i = 0; i < nodes.length; i++) {
                        const node = nodes[i];
                        nodesArr.push(node);
                    }
                    return nodesArr.filter(function (node) {
                        return elems.indexOf(node) !== -1;
                    });
                })
            ],

            xpath: [
                utils.es5(function (elems, input) {
                    if (input === undefined) return [];

                    const result = document.evaluate(input, document, null, XPathResult.ANY_TYPE, null);

                    let node = null;
                    const nodes: Node[] = [];

                    while ((node = result.iterateNext())) {
                        nodes.push(node);
                    }

                    return elems.filter((elem) => nodes.indexOf(elem) !== -1);
                })
            ],

            // Has css style 'name:value'
            style: [
                utils.es5(function (elems, input) {
                    if (input === undefined) return [];

                    const matches = input.match(/^([^: ]+):(.*)$/);
                    if (!matches) {
                        return [];
                    }

                    const name = matches[1];
                    const value = matches[2];

                    return elems.filter(function (elem) {
                        return window.getComputedStyle(elem)[name].toString() == value;
                    });
                })
            ],

            // Same as an ord, returns nth elem, where n is 1-indexed
            position: [
                utils.es5(function (elems, input) {
                    if (input === undefined) return [];

                    return [elems[parseInt(input) - 1]];
                })
            ],

            textbox: [
                utils.es5(function (elems) {
                    const nodesArr = [...document.querySelectorAll('input, textarea')].filter((node) => {
                        const tagName = node.tagName.toLowerCase();
                        return (
                            (tagName === 'input' &&
                                (node.type === 'text' || node.type === 'password' || node.type === 'search')) ||
                            tagName === 'textarea'
                        );
                    });

                    return elems.filter(function (elem) {
                        return nodesArr.indexOf(elem) != -1;
                    });
                })
            ]
        };
    }

    /**
     * Canonicalizes the text of a prop and isolates the input
     * @return {Array} Where index 0 contains the canonicalized prop name, and index 1 contains the input (undefined if no input)
     */
    static canonicalizePropStr(str: string) {
        const canonStr = str.replace(Constants.QUOTED_STRING_LITERAL, '').trim().replace(/\s+/g, ' ').toLowerCase();

        let input = (str.match(Constants.QUOTED_STRING_LITERAL) || [])[0];
        if (input) {
            if (str.trim().indexOf(input) + input.length < str.trim().length) {
                // if the input isn't at the very end of str, it's not input
                return [str];
            }

            input = utils.stripQuotes(input);
            input = utils.unescape(input);
        }

        return [canonStr, input];
    }
}

export default ElementFinder;
