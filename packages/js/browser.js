const {Builder, By, Key, until} = require('selenium-webdriver');

class Browser {
    constructor(runInstance) {
        this.driver = null;
        this.runInstance = runInstance;
    }

    /**
     * Opens the browser
     * @param {String} description - <browser name> <optional version> <optional platform>
     * <browser name> = 'chrome', 'firefox', 'safari', 'internet explorer', or 'MicrosoftEdge'
     */
    async open(description) {
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

        this.driver = new Builder().forBrowser(name, version, platform).build();
    }

    async get(url) {
        await this.driver.get(url);




    }
}
module.exports = Browser;
