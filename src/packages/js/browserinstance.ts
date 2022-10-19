/* globals sinon */
import Jimp from 'jimp';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { Builder, By, Key, until, WebDriver, WebElement } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome.js';
import * as edge from 'selenium-webdriver/edge.js';
import * as firefox from 'selenium-webdriver/firefox.js';
import * as ie from 'selenium-webdriver/ie.js';
import * as safari from 'selenium-webdriver/safari.js';
import Sinon, { SinonFakeServer } from 'sinon';
import invariant from 'tiny-invariant';
import { reporter } from '../../core/instances.js';
import RunInstance from '../../core/runinstance.js';
import Runner from '../../core/runner.js';
import Step from '../../core/step.js';
import { BrowserParams, EFElement, FunctionProp } from '../../core/types.js';
import * as utils from '../../core/utils.js';
import Comparer from './comparer.js';
import ElementFinder from './elementfinder.js';
import { stubfetch } from './stubfetch.js';

class BrowserInstance {
    driver: WebDriver | null = null;
    runInstance;
    startTime?: Date;
    params: BrowserParams | null = null;
    definedProps = ElementFinder.defaultProps();

    // ***************************************
    //  Static functions
    // ***************************************

    /**
     * Creates a new BrowserInstance and initializes global vars in runInstance
     * @return {BrowserInstance} The newly created BrowserInstance
     */
    static create(runInstance: RunInstance) {
        const browser = runInstance.g('browser', new BrowserInstance(runInstance));

        // Register this browser in the persistent array browsers
        // Used to kill all open browsers if the runner is stopped
        let browsers = runInstance.p('browsers');
        if (!browsers) {
            browsers = runInstance.p('browsers', []);
        }

        browsers.push(browser);
        runInstance.p('browsers', browsers);

        // Set commonly-used global vars
        runInstance.g('Comparer', Comparer);
        runInstance.g('ElementFinder', ElementFinder);

        runInstance.g('Builder', Builder);
        runInstance.g('By', By);
        runInstance.g('Key', Key);
        runInstance.g('until', until);

        runInstance.g('$', browser.$.bind(browser));
        runInstance.g('$$', browser.$$.bind(browser));
        runInstance.g('not$', browser.not$.bind(browser));

        runInstance.g('executeScript', browser.executeScript.bind(browser));
        runInstance.g('executeAsyncScript', browser.executeAsyncScript.bind(browser));

        runInstance.g('props', browser.props.bind(browser));
        runInstance.g('propsAdd', browser.propsAdd.bind(browser));
        runInstance.g('propsClear', browser.propsClear.bind(browser));
        runInstance.g('str', browser.str.bind(browser));

        runInstance.g('injectSinon', browser.injectSinon.bind(browser));
        runInstance.g('mockTime', browser.mockTime.bind(browser));
        runInstance.g('mockHttp', browser.mockHttp.bind(browser));
        runInstance.g('mockHttpConfigure', browser.mockHttpConfigure.bind(browser));
        runInstance.g('mockTimeStop', browser.mockTimeStop.bind(browser));
        runInstance.g('mockHttpStop', browser.mockHttpStop.bind(browser));
        runInstance.g('mockStop', browser.mockStop.bind(browser));

        return browser;
    }

    /**
     * Kills all open browsers
     */
    static async killAllBrowsers(runner: Runner) {
        const browsers = runner.p('browsers');

        if (browsers) {
            for (let i = 0; i < browsers.length; i++) {
                const browser = browsers[i];
                if (browser.driver) {
                    try {
                        await browser.driver.quit();
                    }
                    catch (e) {
                        // ignore errors
                    }

                    browser.driver = null;
                }
            }
        }
    }

    // ***************************************
    //  Browser actions
    // ***************************************

    constructor(runInstance: RunInstance) {
        this.runInstance = runInstance;
    }

    /**
     * Opens the browser
     * See https://w3c.github.io/webdriver/#capabilities
     * @param {Object} [params] - Object containing parameters for this browser
     * @param {String} [params.name] - The name of the browser (e.g., chrome|firefox|safari|internet explorer|MicrosoftEdge)
     * @param {String} [params.version] - The version of the browser
     * @param {String} [params.platform] - The platform (e.g., linux|mac|windows)
     * @param {Number} [params.width] - The initial browser width, in pixels
     * @param {Number} [params.height] - The initial browser height, in pixels
     * @param {String} [params.deviceEmulation] - What mobile device to emulate, if any (overrides params.width and params.height, only works with Chrome)
     * @param {Boolean} [params.isHeadless] - If true, run the browser headlessly, if false do not run the browser headlessly, if not set, use headless unless we're debugging with ~
     * @param {String} [params.testServer] - The absolute url of the standalone selenium server, if we are to use one (e.g., http://localhost:4444/wd/hub)
     * @param {Options} [params.options] - Sets options (see the set[browser]Options() functions in https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/index_exports_Builder.html)
     * @param {Capabilities} [params.capabilities] - Sets capabilities (see the withCapabilities() function in https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/index_exports_Builder.html)
     */
    async open(params: BrowserParams) {
        // Options
        if (!params.options) {
            try {
                params.options = this.runInstance.findVarValue('browser options', false, true); // look for {browser options}, above or below
            }
            catch {
                // ignore
            }
        }
        const options = {
            chrome: <chrome.Options>params.options || new chrome.Options(),
            firefox: <firefox.Options>params.options || new firefox.Options(),
            safari: <safari.Options>params.options || new safari.Options(),
            ie: <ie.Options>params.options || new ie.Options(),
            edge: <edge.Options>params.options || new edge.Options()
        };

        // Capabilities
        if (!params.capabilities) {
            try {
                params.capabilities = this.runInstance.findVarValue('browser capabilities', false, true); // look for {browser capabilities}, above or below
            }
            catch {
                // ignore
            }
        }

        // Browser name
        if (!params.name) {
            try {
                params.name = this.runInstance.findVarValue('browser name', false, true); // look for {browser name}, above or below
            }
            catch (e) {
                params.name = 'chrome'; // defaults to chrome
            }
        }

        // Browser version
        if (!params.version) {
            try {
                params.version = this.runInstance.findVarValue('browser version', false, true); // look for {browser version}, above or below
            }
            catch (e) {
                // it's ok if the variable isn't found (simply don't set browser version)
            }
        }

        // Browser platform
        if (!params.platform) {
            try {
                params.platform = this.runInstance.findVarValue('browser platform', false, true); // look for {browser platform}, above or below
            }
            catch (e) {
                // ignore
            }
        }

        // Mobile device emulation (Chrome only)
        if (!params.deviceEmulation) {
            try {
                params.deviceEmulation = this.runInstance.findVarValue('device', false, true);
            }
            catch (e) {
                // ignore
            }
        }
        if (params.deviceEmulation) {
            options.chrome.setMobileEmulation({ deviceName: params.deviceEmulation });
        }

        // Dimensions
        if (!params.width) {
            try {
                params.width = parseInt(this.runInstance.findVarValue('browser width', false, true)); // look for {browser width}, above or below
            }
            catch (e) {
                // ignore
            }
        }
        if (!params.height) {
            try {
                params.height = parseInt(this.runInstance.findVarValue('browser height', false, true)); // look for {browser height}, above or below
            }
            catch (e) {
                // ignore
            }
        }

        // Headless
        if (params.isHeadless === undefined) {
            params.isHeadless = Boolean(this.runInstance.runner.headless);
        }

        if (params.isHeadless) {
            options.chrome.headless();
            options.firefox.headless();

            // NOTE: safari, ie, and edge don't support headless, so they will always run normally
        }

        // Test server url
        if (!params.testServer) {
            params.testServer = this.runInstance.runner.testServer;
        }

        // No console logging (unless options are explicitly set)
        if (!params.options) {
            options.chrome.addArguments('log-level=3', 'silent');
            options.chrome.excludeSwitches('enable-logging');
        }

        // Log
        let logStr = `Starting browser '${params.name}'`;
        if (params.version) {
            logStr += `, version '${params.version}'`;
        }
        if (params.platform) {
            logStr += `, platform '${params.platform}'`;
        }
        if (params.deviceEmulation) {
            logStr += `, device '${params.deviceEmulation}'`;
        }
        if (params.width) {
            logStr += `, width '${params.width}'`;
        }
        if (params.height) {
            logStr += `, height '${params.height}'`;
        }
        if (
            params.isHeadless &&
            params.name &&
            !['safari', 'internet explorer', 'MicrosoftEdge'].includes(params.name)
        ) {
            logStr += ', headless mode';
        }
        if (params.serverUrl) {
            logStr += `, server url '${params.serverUrl}'`;
        }

        this.runInstance.log(logStr);

        // Build the driver
        let builder = new Builder()
            .forBrowser(params.name, params.version, params.platform)
            .setChromeOptions(options.chrome)
            .setFirefoxOptions(options.firefox)
            .setSafariOptions(options.safari)
            .setIeOptions(options.ie)
            .setEdgeOptions(options.edge);

        if (params.testServer) {
            builder = builder.usingServer(params.testServer);
        }

        if (params.capabilities) {
            builder = builder.withCapabilities(params.capabilities);
        }

        this.driver = await builder.build();
        this.startTime = new Date();
        this.params = params;

        // Resize to dimensions
        // NOTE: Options.windowSize() wasn't working properly
        if (params.width && params.height && !(params.name === 'chrome' && params.deviceEmulation)) {
            await this.driver.manage().window().setRect({ width: params.width, height: params.height });
        }

        // Set timeouts
        await this.driver.manage().setTimeouts({ implicit: 0, pageLoad: 30 * 1000, script: 30 * 1000 });
    }

    /**
     * Closes this browser
     */
    async close() {
        try {
            if (this.driver) {
                await this.driver.quit();
            }
        }
        catch (e) {
            // ignore
        }

        const browsers = this.runInstance.p('browsers');
        for (let i = 0; i < browsers.length; i++) {
            if (browsers[i] === this) {
                browsers.splice(i, 1);
            }
        }
    }

    /**
     * Navigates the browser to the given url
     * @param {String} url - The absolute or relative url to navigate to. If relative, uses the browser's current domain. If http(s) is omitted, uses http://
     */
    async nav(url: string) {
        const URL_REGEX = /^(https?:\/\/|file:\/\/)?([^/]*(:[0-9]+)?)?(.*)/;
        let matches = url.match(URL_REGEX);

        invariant(matches, `Invalid url: ${url}`);
        invariant(this.driver, 'Missing driver instance');

        const protocol = matches[1] || 'http://';
        let domain = matches[2];
        const path = matches[4];

        if (protocol != 'file://') {
            if (!domain) {
                const currUrl = await this.driver.getCurrentUrl();
                matches = currUrl.match(URL_REGEX);
                invariant(
                    matches?.[2],
                    'Cannot determine domain to navigate to. Either include a domain or have the browser already be at a page with a domain.'
                );
                domain = matches[2];
            }

            url = protocol + domain + (path || '');
        }

        await this.driver.get(url);
    }

    /**
     * Sends keys from text into the given element
     * The text can contain special keys, e.g., "one[enter]two" means type in "one", press enter, then type in "two"
     * See https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/input_exports_Key.html for a full list of special keys
     * @param {String} text - The text to type in
     * @param {String, ElementFinder, or WebElement} element - The element to type into (same as the element sent to $())
     */
    async type(text: string, element: EFElement) {
        let items = text.split(/(?=(?<=[^\\])\[)|(?<=(?=[^\\])\])/g);
        items = items.map((item) => {
            const keyName = item.match(/^\[(?<keyName>.*)\]$/)?.groups?.keyName?.toUpperCase();

            const isKey = (keyName: string): keyName is keyof typeof Key => keyName in Key;

            if (keyName) {
                // @todo Add support for chord()?
                if (!isKey(keyName) || keyName === 'chord') {
                    throw new Error(`Invalid key ${item}`);
                }
                return Key[keyName];
            }
            else {
                return item;
            }
        });

        await (await this.$(element)).sendKeys(...items);
    }

    /**
     * Selects an item from a <select> dropdown
     * First tries to find a target item that's an exact match, and if one isn't found, tries using contains/trimmed/case-insensitive matching
     * @param {String} value - The string that the target item should match
     * @param {String, ElementFinder, or WebElement} dropdownElement - The dropdown element (same as the element sent to $())
     */
    async selectByValue(value: string, dropdownElement: EFElement) {
        const EXACT_LOG = `Found item that exactly matches '${value}'`;
        const INEXACT_LOG = `Didn't find item that exactly matches '${value}'. Trying to find an item that contains it.`;
        const FOUND_LOG = `Found item that contains '${value}'`;

        dropdownElement = await this.$(dropdownElement, true);
        const dropdownCoords = this.runInstance.currStep ? this.runInstance.currStep.targetCoords : null;

        const tagName = await dropdownElement.getTagName();
        if (tagName.toLowerCase() === 'select') {
            try {
                const item = await this.$(
                    `selector 'option', contains exact '${this.str(value)}', any visibility`,
                    false,
                    dropdownElement
                );
                this.runInstance.log(EXACT_LOG);
                await item.click();
            }
            catch (e) {
                this.runInstance.log(INEXACT_LOG);
                const item = await this.$(
                    `selector 'option', contains '${this.str(value)}', any visibility`,
                    false,
                    dropdownElement
                );
                this.runInstance.log(FOUND_LOG);
                await item.click();
            }
        }
        else {
            throw new Error('Target element is not a <select>');
        }

        if (this.runInstance.currStep) {
            this.runInstance.currStep.targetCoords = dropdownCoords; // restore the dropdown's coords, since the option's coords took over
        }
    }

    /**
     * Selects an item from a <select> dropdown or custom dropdown (via clicks)
     * @param {String, ElementFinder, or WebElement} element - The target item (same as the element sent to $())
     * @param {String, ElementFinder, or WebElement} dropdownElement - The dropdown element (same as the element sent to $())
     */
    async selectByElem(element: EFElement, dropdownElement: EFElement) {
        element = await this.$(element, true);
        dropdownElement = await this.$(dropdownElement, true);

        const tagName = await dropdownElement.getTagName();
        if (tagName.toLowerCase() != 'select') {
            // Click it open
            await dropdownElement.click();
        }

        await element.click();
    }

    /**
     * @return {Boolean} True if an alert is open, false otherwise
     */
    async isAlertOpen() {
        invariant(this.driver, 'Missing driver instance in isAlertOpen');

        let alertOpen = true;
        try {
            await this.driver.switchTo().alert();
        }
        catch (e) {
            alertOpen = false;
        }

        return alertOpen;
    }

    // ***************************************
    //  Execute script in browser
    // ***************************************

    /**
     * Executes a script inside the browser
     * See executeScript() at https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html
     * @return {Promise} Promise that resolves to the script's return value
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async executeScript<Fn extends (...args: any[]) => unknown>(
        script: Fn,
        ...args: unknown[]
    ): Promise<ReturnType<Fn>> {
        invariant(this.driver, 'Missing driver instance in executeScript');
        return await this.driver.executeScript(script, ...args);
    }

    /**
     * Executes a script inside the browser
     * See executeAsyncScript() at https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html
     * @return {Promise} Promise that resolves to the script's return value
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async executeAsyncScript<Fn extends (...args: any[]) => unknown>(script: Fn, ...args: unknown[]): Promise<unknown> {
        invariant(this.driver, 'Missing driver instance in executeAsyncScript');
        return await this.driver.executeAsyncScript(script, ...args);
    }

    // ***************************************
    //  Screenshots
    // ***************************************

    /**
     * Takes a screenshot, stores it on disk, and attaches it to the report for the current step
     * @param {Boolean} [isAfter] If true, this screenshot occurs after the step's main action, false if it occurs before. You must have called this function with isAfter set to false prior to calling it with isAfter set to true.
     * param {Object} [targetCoords] - Object in form { x: <number>, y: <number> } representing the x,y coords of the target of the action (where x and y are a percentage of the total width and height respectively)
     */
    async takeScreenshot(isAfter: boolean, targetCoords?: Step['targetCoords']) {
        // See if screenshot is allowed
        if (!this.runInstance.runner.reporter) {
            return;
        }
        if (!this.runInstance.runner.screenshots) {
            return;
        }
        if (this.runInstance.tree.stepDataMode === 'none') {
            return;
        }
        if (
            this.runInstance.runner.screenshotCount >= this.runInstance.runner.maxScreenshots &&
            this.runInstance.runner.maxScreenshots !== -1
        ) {
            return;
        }
        if (!this.runInstance.currStep || !this.runInstance.currBranch) {
            return;
        }
        if (!this.runInstance.tree.hasCodeBlock(this.runInstance.currStep)) {
            return;
        }

        // Create smashtest/screenshots if it doesn't already exist
        const dir = path.join(reporter.getPathFolder(), 'screenshots');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Take screenshot
        let data = null;
        try {
            invariant(this.driver, 'Missing driver instance in takeScreenshot');
            data = await this.driver.takeScreenshot();
        }
        catch (e) {
            // fail silently
        }

        if (!data) {
            return;
        }

        // Write screenshot to file
        const filename = `${this.runInstance.currBranch.hash}_${
            this.runInstance.currBranch.steps.indexOf(this.runInstance.currStep) || '0'
        }_${isAfter ? 'after' : 'before'}.jpg`;
        const SCREENSHOT_WIDTH = 1000;
        await (await Jimp.read(Buffer.from(data, 'base64')))
            .resize(SCREENSHOT_WIDTH, Jimp.AUTO)
            .quality(60)
            .writeAsync(path.join(reporter.getFullSSPath(), filename));

        // Include crosshairs in report
        if (targetCoords) {
            this.runInstance.currStep.targetCoords = targetCoords;
        }

        this.runInstance.runner.screenshotCount++;
    }

    /**
     * Clears the current branch's screenshots if the --step-data mode requires it
     */
    async clearUnneededScreenshots() {
        invariant(this.runInstance.currBranch, 'currBranch is null in clearUnneededScreenshots');
        invariant(this.runInstance.currBranch.hash, 'currBranch.hash is undefined in clearUnneededScreenshots');

        if (this.runInstance.tree.stepDataMode === 'fail' && !this.runInstance.currBranch.isFailed) {
            // NOTE: for stepDataMode of 'none', a screenshot wasn't created in the first place
            // Delete all screenshots with a filename that begins with the currBranch's hash
            const screenshotsDir = `${path.join(reporter.getPathFolder(), 'screenshots')}`;
            let files: string[] = [];
            try {
                files = fs.readdirSync(screenshotsDir);
            }
            catch (e) {
                // it's ok if the directory doesn't exist
            }

            for (const file of files) {
                if (file.startsWith(this.runInstance.currBranch.hash)) {
                    fs.unlinkSync(path.join(screenshotsDir, file));
                    this.runInstance.runner.screenshotCount--; // decrement screenshotCount for every screenshot deleted
                }
            }
        }
    }

    /**
     * Sets the crosshairs for the before screenshot to the given WebElement's coordinates
     */
    async setCrosshairs(elem: WebElement) {
        if (!this.runInstance.currStep) {
            return;
        }

        const rect = await this.executeScript(function (elem: Element) {
            const rect = elem.getBoundingClientRect();

            return {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                clientWidth: document.body.clientWidth,
                clientHeight: document.body.clientHeight
            };
        }, elem);

        this.runInstance.currStep.targetCoords = {
            x: ((rect.left + rect.width / 2) / rect.clientWidth) * 100,
            y: ((rect.top + rect.height / 2) / rect.clientHeight) * 100
        };
    }

    /**
     * If the given WebElement is not currently scrolled into view, scrolls it into view and retakes the before screenshot
     */
    async scrollIntoView(elem: WebElement) {
        const isScrolledIntoView = await this.executeScript(
            utils.es5(function (elem: Element) {
                const rect = elem.getBoundingClientRect();
                const isScrolledIntoView = rect.top >= 0 && rect.bottom <= window.innerHeight;
                if (!isScrolledIntoView) {
                    elem.scrollIntoView();
                }
                return isScrolledIntoView;
            }),
            elem
        );

        if (!isScrolledIntoView) {
            await this.takeScreenshot(false);
        }
    }

    // ***************************************
    //  Elements
    // ***************************************

    /**
     * Finds the first matching element. Waits up to timeout ms.
     * Scrolls to the matching element, if found.
     * @param {String, ElementFinder, or WebElement} element - A string or EF representing the EF to use. If set to a WebElement, returns that WebElement.
     * @param {Boolean} [tryClickable] - If true, first try searching among clickable elements only (see 'clickable' in ElementFinder's defaultProps()). If no elements are found, searches among non-clickable elements.
     * @param {WebElement} [parentElem] - If set, only searches at or within this parent element
     * @param {Number} [timeout] - How many ms to wait before giving up (2000 ms if omitted)
     * @param {Boolean} [isContinue] - If true, and if an error is thrown, that error's continue will be set to true
     * @return {Promise} Promise that resolves to first WebDriver WebElement that was found
     * @throws {Error} If a matching element wasn't found in time, or if an element array wasn't properly matched in time
     */
    async $(elem: EFElement, tryClickable?: boolean, parentElem?: WebElement, timeout?: number, isContinue?: boolean) {
        invariant(this.driver, 'Driver is not set in $()');

        timeout = timeout !== undefined ? timeout : 2000;

        if (elem instanceof WebElement) {
            return elem;
        }

        let ef: ElementFinder | null = null;

        if (typeof elem === 'string') {
            if (!elem.match(/\n/g)) {
                elem = elem.trim();
            }
            ef = new ElementFinder(elem, this.definedProps);
        }
        else {
            ef = elem;
        }

        if (tryClickable) {
            ef.addProp('clickable', 'clickable', undefined, undefined, this.definedProps, true);
            try {
                const results = await ef.find(this.driver, parentElem, false, isContinue, timeout);
                this.runInstance.log(`Clickable element found for \`${ef.print()}\``);
                const result = results[0];

                await this.scrollIntoView(result);
                await this.setCrosshairs(result);

                return result;
            }
            catch (e) {
                ef.props.shift(); // remove 'clickable'
                this.runInstance.log(
                    `No elements from \`${ef.print()}\` match the \`clickable\` prop, so trying all elements`
                );
            }
        }

        const results = await ef.find(this.driver, parentElem, false, isContinue, timeout);
        const result = results[0];

        await this.scrollIntoView(result);
        await this.setCrosshairs(result);

        return result;
    }

    /**
     * Finds the matching elements. Waits up to timeout ms.
     * See $() for param details
     * If element is an EF and a counter isn't set on the top element, sets it to 1+
     * @return {Promise} Promise that resolves to Array of WebDriver WebElements that were found
     * @throws {Error} If matching elements weren't found in time, or if an element array wasn't properly matched in time
     */
    async $$(element: EFElement, parentElem: WebElement | undefined, timeout: number, isContinue: boolean) {
        invariant(this.driver, 'Driver is not set in $$()');

        timeout = timeout !== undefined ? timeout : 2000;

        let ef = null;
        if (typeof element === 'string') {
            if (!element.match(/\n/g)) {
                element = element.trim();
            }
            ef = new ElementFinder(element, this.definedProps);
        }
        else if (element instanceof ElementFinder) {
            ef = element;
        }
        else {
            return [element];
        }

        if (ef.counter.default) {
            ef.counter = { min: 1 };
        }

        const results = await ef.find(this.driver, parentElem, false, isContinue, timeout);
        return results;
    }

    /**
     * Throws an error if the given element(s) don't disappear before the timeout
     * See $() for param details
     * @return {Promise} Promise that resolves if the given element(s) disappear before the timeout
     * @throws {Error} If matching elements still found after timeout
     */
    async not$(element: EFElement, parentElem: WebElement | undefined, timeout?: number, isContinue?: boolean) {
        invariant(this.driver, 'Driver is not set in not$()');

        timeout = timeout !== undefined ? timeout : 2000;

        let ef = null;
        if (typeof element === 'string') {
            if (!element.match(/\n/g)) {
                element = element.trim();
            }
            ef = new ElementFinder(element, this.definedProps);
        }
        else if (element instanceof ElementFinder) {
            ef = element;
        }
        else {
            const el = element;
            try {
                await this.driver.wait(async () => {
                    return (await el.isDisplayed()) === false;
                }, timeout);
            }
            catch (e) {
                if (e instanceof Error && e.message.includes('Wait timed out after')) {
                    throw new Error(`Element still found after timeout (${timeout / 1000} s)`);
                }
                else {
                    throw e;
                }
            }
            return;
        }

        await ef.find(this.driver, parentElem, true, isContinue, timeout);
    }

    /**
     * Sets the definition of the given EF props
     * @param {Object} props - Object with format { 'name of prop': <String EF or function to add to the prop's defintion>, etc. }
     * @param {Boolean} [isAdd] - If true, does not override existing defintions, but adds to them
     */
    props(props: { [key: string]: string | FunctionProp | ElementFinder }, isAdd: boolean) {
        for (const propName in props) {
            if (Object.prototype.hasOwnProperty.call(props, propName)) {
                let prop = props[propName];
                if (typeof prop === 'string') {
                    // parse it as an EF
                    prop = new ElementFinder(prop, this.definedProps, undefined, this.runInstance.log);
                }
                else if (typeof prop === 'function') {
                    // empty
                }
                else {
                    throw new Error(
                        `Invalid value of prop '${propName}'. Must be either a string ElementFinder or a function.`
                    );
                }

                const [canonProp] = ElementFinder.canonicalizePropStr(propName);
                if (isAdd) {
                    if (!this.definedProps[canonProp]) {
                        this.definedProps[canonProp] = [];
                    }
                    this.definedProps[canonProp].push(prop);
                }
                else {
                    this.definedProps[canonProp] = [prop];
                }
            }
        }
    }

    /**
     * Adds definitions for the given EF props. Keeps existing definitions.
     * A prop matches an element if at least one of its definitions matches.
     * @param {Object} props - Object with format { 'name of prop': <String EF or function to add to the prop's defintion>, etc. }
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    propsAdd(props: { [key: string]: string | FunctionProp }) {
        this.props(props, true);
    }

    /**
     * Clears all definitions of the given EF props
     */
    propsClear(names: string[]) {
        names.forEach((name) => delete this.definedProps[name]);
    }

    /**
     * Escapes the given string for use in an EF
     * Converts a ' to a \', " to a \", etc.
     */
    str(str: string) {
        return utils.escape(str);
    }

    // ***************************************
    //  Verify
    // ***************************************

    /**
     * Throws error if current page's title or url doesn't contain the given string within timeout ms
     * @param {String} titleOrUrl - A string that the title or url must contain, or a string containing a regex that the title or url must match
     */
    async verifyAtPage(titleOrUrl: string, timeout: number) {
        let obj: Record<string, unknown> = {};
        invariant(this.driver, 'Driver is not set in verifyAtPage()');
        try {
            await this.driver.wait(async () => {
                obj = await this.executeScript(utils.es5(verifier), titleOrUrl);
                return obj.isMatched;
            }, timeout);
        }
        catch (err) {
            if (err instanceof Error && err.message.includes('Wait timed out after')) {
                throw new Error(
                    `Neither the page title ('${obj.title}'), nor the page url ('${
                        obj.url
                    }'), contain the string or regex '${titleOrUrl}' after ${timeout / 1000} s`
                );
            }
            else {
                throw err;
            }
        }

        function verifier(titleOrUrl: string) {
            let isMatched =
                document.title.toLowerCase().indexOf(titleOrUrl.toLowerCase()) !== -1 ||
                window.location.href.indexOf(titleOrUrl) !== -1;

            if (!isMatched) {
                // try them as regexes
                try {
                    isMatched = Boolean(document.title.match(titleOrUrl) || window.location.href.match(titleOrUrl));
                }
                catch {
                    // in case of a bad regex
                }
            }

            return {
                isMatched,
                title: document.title,
                url: window.location.href
            };
        }
    }

    /**
     * Throws error if cookie with the given name doesn't contain the given value within timeout ms
     */
    async verifyCookieContains(name: string, value: string, timeout: number) {
        invariant(this.driver, 'Driver is not set in verifyCookieContains()');

        try {
            await this.driver.wait(async () => {
                let cookie = null;
                try {
                    invariant(this.driver, 'Driver is not set in verifyCookieContains()');
                    cookie = await this.driver.manage().getCookie(name);
                }
                catch (e) {
                    if (e instanceof Error && e.message.includes('No cookie with name')) {
                        return false;
                    }
                    else {
                        throw e;
                    }
                }

                if (!cookie) {
                    return false;
                }

                return cookie.value.includes(value);
            }, timeout);
        }
        catch (e) {
            if (e instanceof Error && e.message.includes('Wait timed out after')) {
                throw new Error(`The cookie '${name}' didn't contain '${value}' after ${timeout / 1000} s`);
            }
            else {
                throw e;
            }
        }
    }

    /**
     * Verifies that element also matches state
     * @param {String, ElementFinder, or WebElement} element - A string or EF representing the EF to use. If set to a WebElement, returns that WebElement.
     * @param {String, ElementFinder, or WebElement} state - A string or EF representing the EF to use. If set to a WebElement, returns that WebElement.
     * @param {Number} [timeout] - How many ms to wait before giving up (2000 ms if omitted)
     * @throws {Error} If element doesn't match state within the given time
     */
    async verifyState(element: EFElement, state: EFElement, timeout: number) {
        const elem = await this.$(element, undefined, undefined, timeout, true);
        let stateElems = [];
        const ERR = 'The given element doesn\'t match the given state';

        try {
            stateElems = await this.$$(state, elem, timeout, true);
        }
        catch (e) {
            throw new Error(ERR);
        }

        if (stateElems.length == 0 || (await stateElems[0].getId()) != (await elem.getId())) {
            throw new Error(ERR);
        }
    }

    /**
     * Verifies that every element that matches element also matches state
     * See verifyState() for param details
     */
    async verifyEveryState(element: EFElement, state: EFElement, timeout: number) {
        const elems = await this.$$(element, undefined, timeout, true);

        for (let i = 0; i < elems.length; i++) {
            const elem = elems[i];
            let stateElems = [];
            const ERR = `Matched element number ${i + 1} doesn't match the given state`;

            try {
                stateElems = await this.$$(state, elem, timeout, true);
            }
            catch (e) {
                throw new Error(ERR);
            }

            if (stateElems.length == 0 || (await stateElems[0].getId()) != (await elem.getId())) {
                throw new Error(ERR);
            }
        }
    }

    // ***************************************
    //  Mocks
    // ***************************************

    /**
     * Injects sinon library (sinonjs.org) into the browser, if it's not already defined there
     * Sinon will be available inside the browser at the global js var 'sinon'
     */
    async injectSinon() {
        const sinonExists = await this.executeScript(function () {
            return window.sinon !== undefined;
        });

        if (!sinonExists) {
            const require = createRequire(import.meta.url);
            const sinonCode = fs.readFileSync(
                require.resolve('sinon').replace(/[^/]+$/, '') + '../pkg/sinon.js',
                'utf-8'
            );

            invariant(this.driver, 'this.driver is not defined when sinonCode is injected');

            await this.driver.executeScript(sinonCode);

            // Sinon doesn't stub fetch, for no explicit reason. This is a
            // feasible workaround.
            // Ref: https://github.com/sinonjs/sinon/issues/2082#issuecomment-586552184
            await this.executeScript(stubfetch);
        }
    }

    /**
     * Mock's the current page's Date object to simulate the given time. Time will run forward normally.
     * See https://sinonjs.org/releases/latest/fake-timers/ for more details
     * @param {Date} time - The time to set the browser to
     */
    async mockTime(time: Date) {
        await this.mockTimeStop(); // stop any existing time mocks
        await this.injectSinon();
        await this.executeScript(function (timeStr) {
            window.smashtestSinonClock = window.sinon.useFakeTimers({
                now: new Date(timeStr),
                shouldAdvanceTime: true
            });
        }, time.toString());
    }

    /**
     * Mocks the current page's XHR. Sends back the given response for any http requests to the given method/url from the current page.
     * You can use multiple calls to this function to set up multiple routes. If a request doesn't match a route, it will get a 404 response.
     * See https://sinonjs.org/releases/latest/fake-xhr-and-server/ for more details
     * @param {String} method - The HTTP method ('GET', 'POST', etc.)
     * @param {String or RegExp} url - A url or a regex that matches urls
     * @param response - A String representing the response body, or
     *                   An Object representing the response body (it will be converted to JSON), or
     *                   an array in the form [ <status code>, { header1: "value1", etc. }, <response body string or object> ], or
     *                   a function
     *                   See server.respondWith() from https://sinonjs.org/releases/latest/fake-xhr-and-server/#fake-server-options
     */
    async mockHttp(method: string, url: unknown, response: string | object) {
        // Validate and serialize url
        let typeofUrl: 'string' | 'regex' = 'string';

        if (typeof url === 'object' && url instanceof RegExp) {
            typeofUrl = 'regex';
            url = url.toString();
        }
        else if (typeof url !== 'string') {
            throw new Error('Invalid url type');
        }

        // Validate and serialize response
        let typeofResponse: 'string' | 'function' | 'array' | 'object' = 'string';

        if (typeof response === 'function') {
            typeofResponse = 'function';
            response = response.toString();
        }
        else if (typeof response === 'object') {
            typeofResponse = 'object';

            if (Array.isArray(response)) {
                typeofResponse = 'array';
                if (typeof response[2] === 'object') {
                    response[2] = JSON.stringify(response[2]);
                }
            }

            response = JSON.stringify(response);
        }
        else if (typeofResponse !== 'string') {
            throw new Error('Invalid response type');
        }

        await this.injectSinon();
        await this.executeScript(
            function (
                method: string,
                url: string,
                response: string,
                $typeofUrl: typeof typeofUrl,
                $typeofResponse: typeof typeofResponse
            ) {
                // Deserialize url
                if ($typeofUrl === 'regex') {
                    url = eval(url);
                }

                // Deserialize response
                if ($typeofResponse === 'function') {
                    eval('response = ' + response.trim());
                }
                else if ($typeofResponse === 'array') {
                    response = JSON.parse(response);
                }

                window.smashtestSinonFakeServer =
                    window.smashtestSinonFakeServer ||
                    // @ts-expect-error missing from the @types definition
                    (window.sinon.createFakeServer({ respondImmediately: true }) as SinonFakeServer);
                window.smashtestSinonFakeServer.respondWith(method, url, response);
            },
            method,
            url,
            response,
            typeofUrl,
            typeofResponse
        );
    }

    /**
     * Sets configs on the currently mocked XHR
     * @param {Object} config - The options to set (key value pairs)
     * See server.configure(config) in https://sinonjs.org/releases/latest/fake-xhr-and-server/#fake-server-options for details on what config options are available
     * Fails silently if no mock is currently active
     */
    async mockHttpConfigure(config: Record<string, unknown>) {
        await this.executeScript(function (config) {
            if (window.smashtestSinonFakeServer !== undefined) {
                // @ts-expect-error this configure method might be missing from the @types definition
                window.smashtestSinonFakeServer.configure(config);
            }
        }, config);
    }

    /**
     * Mocks the browser's location to the given latitude and longitude
     * @param {String or Number} latitude - The latitude to set the browser to
     * @param {String or Number} longitude - The longitude to set the browser to
     */
    async mockLocation(latitude: string | number, longitude: string | number) {
        await this.executeScript(
            function (latitude: string | number, longitude: string | number) {
                if (window.smashtestOriginalGetCurrentPosition === undefined) {
                    window.smashtestOriginalGetCurrentPosition = window.navigator.geolocation.getCurrentPosition;
                }

                window.navigator.geolocation.getCurrentPosition = function (success) {
                    success({
                        coords: {
                            accuracy: 98,
                            altitude: null,
                            altitudeAccuracy: null,
                            heading: null,
                            latitude: parseFloat(String(latitude)),
                            longitude: parseFloat(String(longitude)),
                            speed: null
                        },
                        timestamp: new Date().valueOf()
                    });
                };
            },
            latitude,
            longitude
        );
    }

    /**
     * Stops geolocation mock
     */
    async mockLocationStop() {
        await this.executeScript(function () {
            if (window.smashtestOriginalGetCurrentPosition !== undefined) {
                window.navigator.geolocation.getCurrentPosition = window.smashtestOriginalGetCurrentPosition;
                window.smashtestOriginalGetCurrentPosition = undefined;
            }
        });
    }

    /**
     * Stops and reverts all time-related mocks
     */
    async mockTimeStop() {
        await this.executeScript(function () {
            if (window.smashtestSinonClock !== undefined) {
                window.smashtestSinonClock.restore();
                window.smashtestSinonClock = undefined;
            }
        });
    }

    /**
     * Stops and reverts all http-related mocks
     */
    async mockHttpStop() {
        await this.executeScript(function () {
            if (window.smashtestSinonFakeServer !== undefined) {
                window.smashtestSinonFakeServer.restore();
                window.smashtestSinonFakeServer = undefined;
            }
        });
    }

    /**
     * Stops and reverts all mocks (time, http, and geolocation)
     */
    async mockStop() {
        await this.mockTimeStop();
        await this.mockHttpStop();
        await this.mockLocationStop();
    }
}

export default BrowserInstance;

declare let window: Window &
    typeof globalThis & {
        smashtestOriginalGetCurrentPosition: typeof window.navigator.geolocation.getCurrentPosition | undefined;
        smashtestSinonClock: sinon.SinonFakeTimers | undefined;
        smashtestSinonFakeServer: sinon.SinonFakeServer | undefined;
        sinon: Sinon.SinonApi | undefined;
    };
