const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.MS_PLAYWRIGHT_MODULE || 'playwright');

const baseUrl = process.env.MS_PREVIEW_BASE_URL || 'http://127.0.0.1:4173';
const screenshotDir = process.env.MS_PREVIEW_SCREENSHOTS || path.resolve(__dirname, '..', 'test-results', 'financing');
const hearth = 'https://app.gethearth.com/partners/top-flight-services/dennis/apply';
const hfs = 'https://www.hfsfinancial.net/promo/690e587831e1eeb8894b2c4d';
fs.mkdirSync(screenshotDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
}

async function verify(browser, name, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  const section = page.locator('#financing');
  await section.scrollIntoViewIfNeeded();
  assert(await section.isVisible(), `${name} financing section is visible`);
  assert(await section.getByRole('link', { name: 'Visit Hearth' }).getAttribute('href') === hearth, `${name} Hearth link is exact`);
  assert(await section.getByRole('link', { name: 'Visit HFS Financial' }).getAttribute('href') === hfs, `${name} HFS link is exact`);
  assert(await section.getByText('Master Scapes does not make credit decisions.').isVisible(), `${name} provider decision disclosure is visible`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${name} has no horizontal overflow`);
  assert(errors.length === 0, `${name} has no page errors`);
  await section.screenshot({ path: path.join(screenshotDir, `${name}-financing.png`) });
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.MS_CHROME_PATH });
  try {
    await verify(browser, 'desktop', { width: 1440, height: 1000 });
    await verify(browser, 'mobile-390', { width: 390, height: 844 });
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
