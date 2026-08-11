const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.stack));
    await page.goto('http://localhost:8080/');
    await new Promise(r => setTimeout(r, 1000));
    await browser.close();
})();
