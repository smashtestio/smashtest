var webdriverio = require('webdriverio');

(async () => {
    const browser = await webdriverio.remote({
        logLevel: 'warn',
        capabilities: {
            browserName: 'chrome'
        }
    });

    await browser.url('https://webdriver.io');

    const title = await browser.getTitle();
    console.log('Title was: ' + title);

    await browser.debug();

    await browser.deleteSession();
})().catch((e) => console.error(e));
