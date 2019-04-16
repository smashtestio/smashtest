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
     * @param {String} [serverUrl] - The absolute url of the standalone selenium server, if we are to use one (e.g., http://localhost:4444/wd/hub)
     */
    async open(name, version, platform, width, height, serverUrl) {
        if(width) {
            //TODO: see if {browser width} is defined below
            // if they're not defined, simply don't set dimensions





        }

        if(height) {
            //TODO: see if {browser height} is defined below
            // if they're not defined, simply don't set dimensions





        }

        // TODO: set this
        let isHeadless = true;



        // Set options for each browser type
        let options = {
            chrome: new chrome.Options(),
            firefox: new firefox.Options()
        };

        if(isHeadless) {
            Object.keys(options).forEach(name => {
                options[name] = options.headless();
            });
        }

        if(width && height) {
            Object.keys(options).forEach(name => {
                options[name] = options.windowSize({width, height});
            });
        }

        let builder = new Builder()
            .forBrowser(name, version, platform)
            .setChromeOptions(options.chrome)
            .setFirefoxOptions(options.firefox);


            // TODO: set options for all possible browsers






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
