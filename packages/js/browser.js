const {Builder, By, Key, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const ElementFinder = require('./elementfinder.js')

class Browser {
    constructor(runInstance) {
        this.driver = null;
        this.runInstance = runInstance;

        this.register();
    }

    /**
     * Registers this browser in the persistent array browsers
     * Used to kill all open browsers if the runner is stopped
     */
    register() {
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
     * @param {String} [name] - The name of the browser (e.g., chrome|firefox|safari|internet explorer|MicrosoftEdge)
     * @param {String} [version] - The version of the browser
     * @param {String} [platform] - The platform (e.g., linux|mac|windows)
     * @param {Number} [width] - The initial browser width, in pixels
     * @param {Number} [height] - The initial browser height, in pixels
     * @param {Boolean} [isHeadless] - If true, run the browser headlessly, if false do not run the browser headlessly, if not set, use headless unless we're debugging
     * @param {String} [serverUrl] - The absolute url of the standalone selenium server, if we are to use one (e.g., http://localhost:4444/wd/hub)
     */
    async open(name, version, platform, width, height, isHeadless, serverUrl) {
        let options = {
            chrome: new chrome.Options(),
            firefox: new firefox.Options()

            // TODO: add other browsers




        };

        // Dimensions

        if(!width) {
            // See if {browser width} is defined below
            try {
                width = parseInt(this.runInstance.findVarValue("browser width", false, this.runInstance.currStep, this.runInstance.currBranch));
            }
            catch(e) {} // it's ok if the variable isn't found (simply don't set dimensions)
        }

        if(!height) {
            // See if {browser height} is defined below
            try {
                height = parseInt(this.runInstance.findVarValue("browser height", false, this.runInstance.currStep, this.runInstance.currBranch));
            }
            catch(e) {} // it's ok if the variable isn't found (simply don't set dimensions)
        }

        if(width && height) {
            options.chrome.windowSize({width, height});

            // TODO: add other browsers





        }

        // Headless

        if(typeof isHeadless == 'undefined') {
            // Set isHeadless to true, unless we're debugging
            isHeadless = !this.runInstance.tree.isDebug;

            // Override if --headless flag is set
            if(this.runInstance.runner.flags.hasOwnProperty("headless")) {
                let headlessFlag = this.runInstance.runner.flags.headless;
                if(headlessFlag === "true" || headlessFlag === "" || headlessFlag === undefined) {
                    isHeadless = true;
                }
                else if(headlessFlag === "false") {
                    isHeadless = false;
                }
                else {
                    throw new Error("Invalid --headless flag value. Must be true or false.");
                }
            }
        }

        if(isHeadless) {
            options.chrome.headless();

            // TODO: add other browsers






        }

        // Server URL

        if(!serverUrl) {
            // If serverUrl isn't set, look to the -seleniumServer flag
            // TODO





        }

        let builder = new Builder()
            .forBrowser(name, version, platform)
            .setChromeOptions(options.chrome)
            .setFirefoxOptions(options.firefox);

            // TODO: add other browsers







        if(serverUrl) {
            builder = builder.usingServer(serverUrl);
        }

        this.driver = builder.build();
    }

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
        // TODO: absolute vs. relative url (for relative, use browser's current domain)




        await this.driver.get(url);
    }

    /**
     * @return {Element} The element matching the given finder
     */
    async element(finder) {







    }
}
module.exports = Browser;
