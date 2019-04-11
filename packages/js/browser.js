const webdriver = require('selenium-webdriver');

class Browser {
    constructor() {
        this.driver = null;
    }

    async open(browserName) {
        this.driver = new webdriver.Builder()
            .forBrowser(browserName)
            .build();


        // TODO: Start 'chrome 15 desktop headless 1900x1280' (any order)
        // TODO: headless browsers too
        // TODO: Log the version, dimensions, etc.
    }

    async get(url) {
        await this.driver.get(url);




    }
}
module.exports = Browser;
