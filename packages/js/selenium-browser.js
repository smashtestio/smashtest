const {Builder, By, Key, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const safari = require('selenium-webdriver/safari');
const ie = require('selenium-webdriver/ie');
const edge = require('selenium-webdriver/edge');
const ElementFinder = require('./elementfinder.js');

class SeleniumBrowser {
    // ***************************************
    //  Static functions
    // ***************************************

    /**
     * Creates a new SeleniumBrowser and initializes global vars in runInstance
     * @return {SeleniumBrowser} The newly created SeleniumBrowser
     */
    static create(runInstance) {
        let browser = runInstance.g('browser', new SeleniumBrowser(runInstance));

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
        runInstance.g('prop', browser.prop);

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
                await browser.driver && browser.driver.quit();
            }
        }
    }

    // ***************************************
    //  Member functions
    // ***************************************

    constructor(runInstance) {
        this.driver = null;
        this.runInstance = runInstance;
        this.props = {}; // ElementFinder props
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
     * @param {Boolean} [params.isHeadless] - If true, run the browser headlessly, if false do not run the browser headlessly, if not set, use headless unless we're debugging
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

        if(params.width && params.height && !params.deviceEmulation) {
            options.chrome.windowSize({width: parseInt(params.width), height: parseInt(params.height)});
            options.firefox.windowSize({width: params.width, height: params.height});

            // NOTE: safari, ie, and edge cannot do a windowSize() and so much be resized to width/heigh post launch
        }

        // Headless

        if(typeof params.isHeadless == 'undefined') {
            // Set isHeadless to true, unless we're debugging
            params.isHeadless = !this.runInstance.tree.isDebug;

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
            // If serverUrl isn't set, look to the -seleniumServer flag
            if(this.runInstance.runner.flags.seleniumServer) {
                params.serverUrl = this.runInstance.runner.flags.seleniumServer;
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

        try {
            this.driver = await builder.build();
        }
        catch(e) {
            e.fatal = true;
            throw e;
        }

        // Resize safari, ie, and edge
        if(['safari', 'internet explorer', 'MicrosoftEdge'].includes(params.name)) {
            this.driver.manage().window().setRect({width: params.width, height: params.height});
        }
    }

    /**
     * Closes this browser
     */
    async close() {
        try {
            await this.driver.quit();
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




        await this.driver.get(url);
    }

    // TODO
    $() {

    }

    // TODO
    $$() {

    }

    /**
     * Sets the given ElementFinder property
     */
    prop(name, value) {
        if(typeof value == 'string') {
            // parse it as an EF
            value = new ElementFinder(value, this.props, runInstance.log);
        }

        this.props[name] = value;
    }

    // /**
    //  * @param {Element} element - A DOM element
    //  * @return {Boolean} true if element is clickable, false if not
    //  */
    // function isClickable(element) {
    //     let tagName = element.tagName.toLowerCase();
    //     return tagName == 'a' ||
    //         tagName == 'button' ||
    //         tagName == 'label' ||
    //         tagName == 'input' ||
    //         tagName == 'textarea' ||
    //         tagName == 'select' ||
    //         window.getComputedStyle(element).getPropertyValue('cursor') == 'pointer';
    // }


    // Finding an elem's label:
    // if(elem.id) {
    //     let labelElement = document.querySelector('label[for=' + CSS.escape(elem.id) + ']');
    //     if(labelElement) {
    //         let innerText = labelElement.innerText.trim();
    //     }
    // }

    // /**
    //  * @return {Bool} True is elem is visible to the user, false otherwise
    //  */
    // function isVisible(elem) {
    //     if(elem.offsetWidth == 0 || elem.offsetHeight == 0) {
    //         return false;
    //     }
    //
    //     var cs = window.getComputedStyle(elem);
    //
    //     if(cs.visibility == 'hidden' || cs.visibility == 'collapse') {
    //         return false;
    //     }
    //
    //     if(cs.opacity == '0') {
    //         return false;
    //     }
    //
    //     // Check opacity of parents
    //     elem = elem.parentElement;
    //     while(elem) {
    //         cs = window.getComputedStyle(elem);
    //         if(cs.opacity == '0') {
    //             return false;
    //         }
    //         elem = elem.parentElement;
    //     }
    //
    //     return true;
    // }
}
module.exports = SeleniumBrowser;
