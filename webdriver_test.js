var webdriverio = require('webdriverio');
var fs = require('fs');

(async () => {
    var data = await fs.readFileSync('./smashtest.crx');

    const browser = await webdriverio.remote({
        logLevel: 'warn',
        capabilities: {
            browserName: 'chrome',
            "goog:chromeOptions": {
                extensions: [data.toString('base64')]
            }
        }
    });

    await browser.url('https://webdriver.io');

    const title = await browser.getTitle();
    console.log('Title was: ' + title);

    await browser.debug();

    await browser.deleteSession();
})().catch((e) => console.error(e));
