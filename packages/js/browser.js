const webdriver = require('selenium-webdriver');

module.exports.openBrowser = async (browserName) => {
    let driver = new webdriver.Builder()
        .forBrowser(browserName)
        .build();

    await driver.get('http://www.webdriverjs.com/');




    // TODO: Start 'chrome 15 desktop headless 1900x1280' (any order)
    // TODO: headless browsers too
    // TODO: Log the version, dimensions, etc.
}
