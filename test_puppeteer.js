const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
    await page.goto('http://localhost:8080/');
    await new Promise(r => setTimeout(r, 1000));
    const html = await page.$eval('#summary-body', el => el.innerHTML);
    const display = await page.$eval('#view-summary', el => window.getComputedStyle(el).display);
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    console.log('summary-body HTML length:', html.length);
    console.log('#view-summary display:', display);
    console.log('html data-theme:', theme);
    if (html.length < 100) console.log('HTML CONTENT:', html);
    await browser.close();
})();
