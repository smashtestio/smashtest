const {Builder, By, Key, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const sharp = require('sharp');

(async () => {
    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(new chrome.Options())
        .build();

    await driver.get('https://cnet.com');

    let data = await driver.takeScreenshot();
    await sharp(Buffer.from(data, 'base64'))
        .resize(500)
        //.toFormat('jpeg')
        .jpeg({
            quality: 10
        })
        // .png({
        //     quality: 10
        // })
        .toFile('ss.jpg');

    await driver.quit();
})();
