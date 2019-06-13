const {Builder, By, Key, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const safari = require('selenium-webdriver/safari');
const ie = require('selenium-webdriver/ie');
const edge = require('selenium-webdriver/edge');
const fs = require('fs');
const path = require('path');
const readFiles = require('read-files-promise');
const sharp = require('sharp');
const utils = require('../../utils.js');
const ElementFinder = require('./elementfinder.js');

class BrowserInstance {
    // ***************************************
    //  Static functions
    // ***************************************

    /**
     * Creates a new BrowserInstance and initializes global vars in runInstance
     * @return {BrowserInstance} The newly created BrowserInstance
     */
    static create(runInstance) {
        let browser = runInstance.g('browser', new BrowserInstance(runInstance));

        // Register this browser in the persistent array browsers
        // Used to kill all open browsers if the runner is stopped
        let browsers = runInstance.p("browsers");
        if(!browsers) {
            browsers = runInstance.p("browsers", []);
        }
        browsers.push(browser);
        runInstance.p("browsers", browsers);

        // Set commonly-used global vars
        runInstance.g('$', browser.$);
        runInstance.g('$$', browser.$$);
        runInstance.g('executeScript', browser.executeScript);
        runInstance.g('executeAsyncScript', browser.executeAsyncScript);
        runInstance.g('props', browser.props);
        runInstance.g('propsAdd', browser.propsAdd);
        runInstance.g('propsClear', browser.propsClear);
        runInstance.g('str', browser.str);

        return browser;
    }

    /**
     * Kills all open browsers
     */
    static async killAllBrowsers(runner) {
        let browsers = runner.p("browsers");
        if(browsers) {
            for(let i = 0; i < browsers.length; i++) {
                let browser = browsers[i];
                if(browser.driver) {
                    try {
                        await browser.driver.quit();
                    }
                    catch(e) {} // ignore errors

                    browser.driver = null;
                }
            }
        }
    }

    // ***************************************
    //  Member functions
    // ***************************************

    constructor(runInstance) {
        this.driver = null;
        this.runInstance = runInstance;
        this.props = ElementFinder.defaultProps();  // ElementFinder props
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
     * @param {String} [params.serverUrl] - The absolute url of the standalone selenium server, if we are to use one (e.g., http://localhost:4444/wd/hub)
     */
    async open(params) {
        if(!params) {
            params = {};
        }

        let options = {
            chrome: new chrome.Options(),
            firefox: new firefox.Options(),
            safari: new safari.Options(),
            ie: new ie.Options(),
            edge: new edge.Options()
        };

        // Browser name

        if(!params.name) {
            try {
                this.runInstance.findVarValue("browser name", false, true); // look for {browser name}, above or below
            }
            catch(e) {
                params.name = "chrome"; // defaults to chrome
            }
        }

        // Browser version

        if(!params.version) {
            try {
                this.runInstance.findVarValue("browser version", false, true); // look for {browser version}, above or below
            }
            catch(e) {}  // it's ok if the variable isn't found (simply don't set browser version)
        }

        // Browser platform

        if(!params.platform) {
            try {
                this.runInstance.findVarValue("browser platform", false, true); // look for {browser platform}, above or below
            }
            catch(e) {}
        }

        // Mobile device emulation (Chrome only)

        if(!params.deviceEmulation) {
            try {
                params.deviceEmulation = this.runInstance.findVarValue("device", false, true);
            }
            catch(e) {}
        }

        if(params.deviceEmulation) {
            options.chrome.setMobileEmulation({deviceName: params.deviceEmulation});
        }

        // Dimensions

        if(!params.width) {
            try {
                params.width = parseInt(this.runInstance.findVarValue("browser width", false, true)); // look for {browser width}, above or below
            }
            catch(e) {}
        }

        if(!params.height) {
            try {
                params.height = parseInt(this.runInstance.findVarValue("browser height", false, true)); // look for {browser height}, above or below
            }
            catch(e) {}
        }

        // Headless

        if(typeof params.isHeadless == 'undefined') {
            // Set isHeadless to true, unless we're debugging with ~
            params.isHeadless = (!this.runInstance.tree.isDebug || this.runInstance.tree.isExpressDebug) && !this.runInstance.runner.isRepl;

            // Override if --headless flag is set
            if(this.runInstance.runner.flags.hasOwnProperty("headless")) {
                let headlessFlag = this.runInstance.runner.flags.headless;
                if(headlessFlag === "true" || headlessFlag === "" || headlessFlag === undefined) {
                    params.isHeadless = true;
                }
                else if(headlessFlag === "false") {
                    params.isHeadless = false;
                }
                else {
                    throw new Error("Invalid --headless flag value. Must be true or false.");
                }
            }
        }

        if(params.isHeadless) {
            options.chrome.headless();
            options.firefox.headless();

            // NOTE: safari, ie, and edge don't support headless, so they will always run normally
        }

        // Server url

        if(!params.serverUrl) {
            // If serverUrl isn't set, look to the -selenium-server flag
            if(this.runInstance.runner.flags['selenium-server']) {
                params.serverUrl = this.runInstance.runner.flags['selenium-server'];
            }
        }

        // Log

        let logStr = `Starting browser '${params.name}'`;
        params.version && (logStr += `, version '${params.version}'`);
        params.platform && (logStr += `, platform '${params.platform}'`);
        params.deviceEmulation && (logStr += `, device '${params.deviceEmulation}'`);
        params.width && (logStr += `, width '${params.width}'`);
        params.height && (logStr += `, height '${params.height}'`);
        params.isHeadless && !['safari', 'internet explorer', 'MicrosoftEdge'].includes(params.name) && (logStr += `, headless mode`);
        params.serverUrl && (logStr += `, server url '${params.serverUrl}'`);

        this.runInstance.log(logStr);

        // Build the driver

        let builder = new Builder()
            .forBrowser(params.name, params.version, params.platform)
            .setChromeOptions(options.chrome)
            .setFirefoxOptions(options.firefox)
            .setSafariOptions(options.safari)
            .setIeOptions(options.ie)
            .setEdgeOptions(options.edge);

        if(params.serverUrl) {
            builder = builder.usingServer(params.serverUrl);
        }

        this.driver = await builder.build();

        // Resize to dimensions
        // NOTE: Options.windowSize() wasn't working properly
        if(params.width && params.height && !(params.name == 'chrome' && params.deviceEmulation)) {
            this.driver.manage().window().setRect({width: params.width, height: params.height});
        }
    }

    /**
     * Closes this browser
     */
    async close() {
        try {
            if(this.driver) {
                await this.driver.quit();
                this.driver = null;
            }
        }
        catch(e) {}

        let browsers = this.runInstance.p("browsers");
        for(let i = 0; i < browsers.length; i++) {
            if(browsers[i] === this) {
                browsers.splice(i, 1);
            }
        }
    }

    /**
     * Navigates the browser to the given url
     * @param {String} url - The absolute or relative url to navigate to. If relative, uses the browser's current domain.
     */
    async nav(url) {
        // TODO:
        // absolute vs. relative url (for relative, use browser's current domain)
        // for no http(s)://, use http://



        await this.takeScreenshot(false);

        await this.driver.get(url);

        await this.takeScreenshot(true);
    }

    /**
     * Takes a screenshot, stores it on disk, and attaches it to the report for the current step
     * @param {Boolean} [isAfter] If true, this screenshot occurs after the step's main action, false if it occurs before. You must have called this function with isAfter set to false prior to calling it with isAfter set to true.
     * param {Object} [targetCoords] - Object in form { x: <number>, y: <number> } representing the x,y coords of the target of the action
     */
    async takeScreenshot(isAfter, targetCoords) {
        // See if screenshot is allowed
        if(!this.runInstance.runner.reporter) {
            return;
        }
        if(!this.runInstance.runner.screenshots) {
            return;
        }
        if(this.runInstance.tree.stepDataMode == 'none') {
            return;
        }
        if(this.runInstance.runner.screenshotCount >= this.runInstance.runner.maxScreenshots && this.runInstance.runner.maxScreenshots != -1) {
            return;
        }
        if(!this.runInstance.currStep || !this.runInstance.currBranch) {
            return;
        }

        // Create smashtest/screenshots if it doesn't already exist
        const dir = 'smashtest/screenshots';
        if(!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }

        // Take screenshot
        let data = null;
        try {
            data = await this.driver.takeScreenshot();
        }
        catch(e) {} // fail silently

        if(!data) {
            return;
        }

        // Write screenshot to file
        let filename = `screenshots/${this.runInstance.currBranch.hash}_${this.runInstance.currBranch.steps.indexOf(this.runInstance.currStep) || `0`}_${isAfter ? `after` : `before`}.jpg`;
        await sharp(Buffer.from(data, 'base64'))
            .resize(1000)
            .jpeg({
                quality: 50
            })
            .toFile(`smashtest/${filename}`);

        // Include crosshairs in report
        if(targetCoords) {
            this.runInstance.currStep.targetCoords = targetCoords;
        }

        this.runInstance.runner.screenshotCount++;
    }

    /**
     * Clears the current branch's screenshots if the --step-data mode requires it
     */
    async clearUnneededScreenshots() {
        if(this.runInstance.tree.stepDataMode == 'fail' && !this.runInstance.currBranch.isFailed) { // NOTE: for stepDataMode of 'none', a screenshot wasn't created in the first place
            // Delete all screenshots with a filename that begins with the currBranch's hash
            const SMASHTEST_SS_DIR = 'smashtest/screenshots';
            let files = fs.readdirSync(SMASHTEST_SS_DIR);
            for(let file of files) {
                if(file.startsWith(this.runInstance.currBranch.hash)) {
                    fs.unlinkSync(path.join(SMASHTEST_SS_DIR, file));
                    this.runInstance.runner.screenshotCount--; // decrement screenshotCount for every screenshot deleted
                }
            }
        }
    }

    /**
     * Finds the first element matching EF represented by efText. Waits up to timeout ms.
     * @param {String} efText - A string representing the EF to use
     * @param {Number} [timeout] - How many ms to wait before giving up (2000 ms if omitted)
     * @param {Boolean} [isContinue] - If true, and if an error is throw, that error's continue will be set to true
     * @param {Boolean} [isNot] - If true, throws an error if the given element doesn't disappear before the timeout
     * @return {Promise} Promise that resolves to first WebDriver WebElement that was found (resolves to nothing if not is set)
     * @throws {Error} If a matching element wasn't found in time, or if an element array wasn't properly matched in time (if not is set, only throws error is elements still found after timeout)
     */
    async $(efText, timeout, isContinue, isNot) {
        let ef = new ElementFinder(efText, this.props);
        let results = await ef.find(this.driver, undefined, isNot, isContinue, timeout || 2000);
        return results[0];
    }

    /**
     * Same params as in $()
     * If counter isn't set on efText, sets it to 1+
     * @return {Promise} Promise that resolves to Array of WebDriver WebElements that were found (resolves to nothing if not is set)
     * @throws {Error} If matching elements weren't found in time, or if an element array wasn't properly matched in time (if not is set, only throws error is elements still found after timeout)
     */
    async $$(efText, timeout, isContinue, isNot) {
        let ef = new ElementFinder(efText, this.props);
        if(ef.counter.default) {
            ef.counter = { min: 1 };
        }

        let results = await ef.find(this.driver, undefined, isNot, isContinue, timeout || 2000);
        return results;
    }

    /**
     * Executes a script inside the browser
     * See executeScript() at https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html
     */
    executeScript(script, ...args) {
        return this.driver.executeScript(script, ...args);
    }

    /**
     * Executes a script inside the browser
     * See executeAsyncScript() at https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html
     */
    executeAsyncScript(script, ...args) {
        return this.driver.executeAsyncScript(script, ...args);
    }

    /**
     * Sets the one and only definition of the given EF props
     * @param {Object} props - Object with format { 'name of prop': <String EF or function to add to the prop's defintion>, etc. }
     */
    props(props) {
        for(let prop in props) {
            if(props.hasOwnProperty(prop)) {
                if(typeof props[prop] == 'string') {
                    // parse it as an EF
                    props[prop] = new ElementFinder(props[prop], this.props, undefined, runInstance.log);
                }
                else if(typeof props[prop] == 'function') {
                }
                else {
                    throw new Error(`Invalid value of prop '${prop}'. Must be either a string ElementFinder or a function.`);
                }

                let [canonProp, canonInput] = ElementFinder.canonicalizePropStr(prop);
                this.props[canonProp] = [ props[prop] ];
            }
        }
    }

    /**
     * Adds definitions for the given EF props. Keeps existing definitions.
     * A prop matches an element if at least one of its definitions matches.
     * @param {Object} props - Object with format { 'name of prop': <String EF or function to add to the prop's defintion>, etc. }
     */
    propsAdd(props) {
        for(let prop in props) {
            if(props.hasOwnProperty(prop)) {
                if(typeof props[prop] == 'string') {
                    // parse it as an EF
                    props[prop] = new ElementFinder(props[prop], this.props, undefined, runInstance.log);
                }
                else if(typeof props[prop] == 'function') {
                }
                else {
                    throw new Error(`Invalid value of prop '${prop}'. Must be either a string ElementFinder or a function.`);
                }

                let [canonProp, canonInput] = ElementFinder.canonicalizePropStr(prop);
                this.props[canonProp].push(props[prop]);
            }
        }
    }

    /**
     * Clears all definitions of the given EF props
     */
    propsClear(names) {
        names.forEach(name => delete this.props[name]);
    }

    /**
     * Escapes the given string for use in an EF
     * Converts a ' to a \', " to a \", etc.
     */
    str(str) {
        return utils.escape(str);
    }
}
module.exports = BrowserInstance;
