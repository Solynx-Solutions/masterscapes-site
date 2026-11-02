const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.MS_PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '..');
const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const destinations = [
  {
    name: 'Hearth',
    source: 'https://app.gethearth.com/partners/top-flight-services/dennis/apply',
    finalHost: 'app.gethearth.com',
    expectedTitle: /Hearth/i
  },
  {
    name: 'HFS Financial',
    source: 'https://www.hfsfinancial.net/promo/690e587831e1eeb8894b2c4d',
    finalHost: 'www.hfsfinancial.net',
    expectedTitle: /HFS Financial/i
  }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.MS_CHROME_PATH });
  try {
    for (const destination of destinations) {
      assert(homepage.includes(`href="${destination.source}"`), `${destination.name} source link is exact`);
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await context.route('**/*', route => ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort('blockedbyclient'));
      const page = await context.newPage();
      const response = await page.goto(destination.source, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(3000);
      const finalUrl = new URL(page.url());
      assert(response && response.status() < 400, `${destination.name} destination returns a successful page`);
      assert(finalUrl.hostname === destination.finalHost, `${destination.name} stays on the expected provider host`);
      assert(destination.expectedTitle.test(await page.title()), `${destination.name} renders the expected provider page`);
      assert(!/page not found|not found|404 error/i.test(await page.locator('body').innerText()), `${destination.name} destination is not an error page`);
      console.log(`DESTINATION ${destination.name} ${finalUrl.toString()}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
