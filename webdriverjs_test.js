const {Builder, By, Key, until} = require('selenium-webdriver');

async function run(testNum) {
    let builder = new Builder()
        .forBrowser('safari')
        .usingServer('http://localhost:4444/wd/hub');
console.log(`Before Build, test ${testNum}`)
        let driver = await builder.build();
console.log(`After Build, test ${testNum}`)
    try {
        await driver.get('http://www.google.com/ncr');
        await driver.findElement(By.name('q')).sendKeys('webdriver', Key.RETURN);
        await driver.wait(until.titleIs('webdriver - Google Search'), 1000);
    } finally {
        await driver.quit();
    }
}

run(1);
run(2);
