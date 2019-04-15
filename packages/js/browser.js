const {Builder, By, Key, until} = require('selenium-webdriver');
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
            browsers.forEach(async (browser) => await browser.driver.quit());
        }
    }

    /**
     * Opens the browser
     * @param {String} description - <browser name> <optional version> <optional platform>
     * @param {String} [serverUrl] - The absolute url of the standalone selenium server, if we are to use one (e.g., http://localhost:4444/wd/hub)
     * <browser name> = 'chrome', 'firefox', 'safari', 'internet explorer', or 'MicrosoftEdge'
     */
    async open(description, serverUrl) {
        if(!description || description == '[functions]') {
            return;
        }

        const DESCRIPTION_REGEX = /(chrome|firefox|safari|internet explorer|MicrosoftEdge)(\s+([0-9\.]+))?(\s+(.*))?/;
        let matches = description.match(DESCRIPTION_REGEX);
        if(!matches) {
            throw new Error("Invalid browser description");
        }

        let name = matches[1];
        let version = matches[3];
        let platform = matches[5];

        if(serverUrl) {
            this.driver = new Builder()
                .forBrowser(name, version, platform)
                .usingServer(serverUrl)
                .build();
        }
        else {
            this.driver = new Builder()
                .forBrowser(name, version, platform)
                .build();
        }
    }

    async close() {
        await this.driver.quit();

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
