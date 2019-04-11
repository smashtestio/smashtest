function openBrowser(browser) {
    let webdriver = imp('selenium-webdriver');

    let driver = new webdriver.Builder()
        .forBrowser('chrome')
        .build();

    await driver.get('http://www.webdriverjs.com/');





    // TODO: Start 'chrome 15 desktop headless 1900x1280' (any order)
    // TODO: headless browsers too
    // TODO: Log the version, dimensions, etc.
}
