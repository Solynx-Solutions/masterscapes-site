const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.MS_PLAYWRIGHT_MODULE || 'playwright');

const baseUrl = process.env.MS_PREVIEW_BASE_URL || 'http://127.0.0.1:4173';
const screenshotDir = process.env.MS_PREVIEW_SCREENSHOTS || path.resolve(__dirname, '..', 'test-results', 'financing-discovery');
fs.mkdirSync(screenshotDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
}

async function verify(browser, name, viewport, reducedMotion = 'no-preference') {
  const context = await browser.newContext({ viewport, reducedMotion });
  await context.route('https://widgets.leadconnectorhq.com/**', route => route.abort('blockedbyclient'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });

  if (viewport.width <= 768) {
    await page.getByRole('button', { name: 'Toggle menu' }).click();
  }

  const navLink = page.getByRole('link', { name: 'Financing', exact: true }).first();
  assert(await navLink.isVisible(), `${name} Financing navigation entry is visible`);
  assert(await navLink.getAttribute('href') === '#financing', `${name} Financing navigation targets the existing section`);

  const notice = page.locator('.financing-notice');
  assert(await notice.isVisible(), `${name} financing notice is visible`);
  const noticeBox = await notice.boundingBox();
  assert(noticeBox && noticeBox.width <= 300 && noticeBox.height <= 150, `${name} notice remains compact`);
  assert(noticeBox && noticeBox.y < viewport.height / 2, `${name} notice stays away from bottom chat and consent controls`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${name} has no horizontal overflow`);

  if (reducedMotion === 'reduce') {
    const animationName = await notice.evaluate(element => getComputedStyle(element).animationName);
    assert(animationName === 'none', `${name} disables notice motion`);
  }

  if (viewport.width <= 768) {
    await page.getByRole('button', { name: 'Toggle menu' }).click();
  }
  await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: false });
  const close = page.getByRole('button', { name: 'Dismiss financing notice' });
  await close.focus();
  await close.press('Enter');
  await notice.waitFor({ state: 'detached' });
  assert(await page.evaluate(() => sessionStorage.getItem('ms_financing_notice_dismissed')) === '1', `${name} keyboard dismissal persists for the session`);
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert(await page.locator('.financing-notice').count() === 0, `${name} dismissed notice stays hidden after reload`);
  assert(errors.length === 0, `${name} has no page errors`);

  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.MS_CHROME_PATH });
  try {
    await verify(browser, 'desktop-1440', { width: 1440, height: 1000 });
    await verify(browser, 'mobile-390', { width: 390, height: 844 });
    await verify(browser, 'mobile-390-reduced-motion', { width: 390, height: 844 }, 'reduce');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
