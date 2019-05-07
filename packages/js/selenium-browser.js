const {Builder, By, Key, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const safari = require('selenium-webdriver/safari');
const ie = require('selenium-webdriver/ie');
const edge = require('selenium-webdriver/edge');
const ElementFinder = require('./elementfinder.js');

class SeleniumBrowser {
    constructor(runInstance) {
        this.driver = null;
        this.runInstance = runInstance;

        // Register this browser in the persistent array browsers
        // Used to kill all open browsers if the runner is stopped
        let browsers = this.runInstance.p("browsers");
        if(!browsers) {
            browsers = this.runInstance.p("browsers", []);
        }

        browsers.push(this);
        this.runInstance.p("browsers", browsers);
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

    /**
     * Opens the browser
     * See https://w3c.github.io/webdriver/#capabilities
     * @param {Object} [params] - Object containing parameters for this browser
     * @param {String} [params.name] - The name of the browser (e.g., chrome|firefox|safari|internet explorer|MicrosoftEdge)
     * @param {String} [params.version] - The version of the browser
     * @param {String} [params.platform] - The platform (e.g., linux|mac|windows)
     * @param {Number} [params.width] - The initial browser width, in pixels
     * @param {Number} [params.height] - The initial browser height, in pixels
     * @param {String} [params.deviceEmulation] - What mobile device to emulate, if any (only works with Chrome)
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





        }

        // Browser version
        if(!params.version) {





        }

        // Browser plaform
        if(!params.platform) {





        }

        // Dimensions

        if(!params.width) {
            // See if {browser width} is defined below
            try {
                params.width = parseInt(this.runInstance.findVarValue("browser width", false, true));
            }
            catch(e) {} // it's ok if the variable isn't found (simply don't set dimensions)
        }

        if(!params.height) {
            // See if {browser height} is defined below
            try {
                params.height = parseInt(this.runInstance.findVarValue("browser height", false, true));
            }
            catch(e) {} // it's ok if the variable isn't found (simply don't set dimensions)
        }

        if(params.width && params.height) {
            options.chrome.windowSize({width: params.width, height: params.height});
            options.firefox.windowSize({width: params.width, height: params.height});

            // TODO: set window size later for safari, ie, and edge





        }

        // Mobile device emulation (Chrome only)

        if(!params.deviceEmulation) {
            try {
                params.deviceEmulation = this.runInstance.findVarValue("device", false, true);
            }
            catch(e) {} // it's ok if the variable isn't found
        }

        if(params.deviceEmulation) {
            options.chrome.setMobileEmulation({deviceName: params.deviceEmulation});
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

            // TODO: what to do about safari, ie, and edge?






        }

        // Server URL

        if(!params.serverUrl) {
            // If serverUrl isn't set, look to the -seleniumServer flag
            if(this.runInstance.runner.flags.seleniumServer) {
                params.serverUrl = this.runInstance.runner.flags.seleniumServer;
            }
        }

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
    }

    /**
     * Closes this browser
     */
    async close() {
        if(this.driver) {
            await this.driver.quit();
        }

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
