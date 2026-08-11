const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
    await page.goto('http://localhost:8080/');
    await page.waitForTimeout(1000);
    const html = await page.$eval('#summary-body', el => el.innerHTML);
    console.log('summary-body HTML length:', html.length);
    if (html.length === 0) console.log('BODY IS EMPTY!');
    await browser.close();
})();
