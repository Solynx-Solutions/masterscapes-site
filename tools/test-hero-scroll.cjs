const { chromium } = require('playwright');

const baseUrl = (process.argv[2] || 'http://127.0.0.1:4173').replace(/\/$/, '');
const chromePath = process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'compact-desktop', width: 812, height: 797 },
  { name: 'mobile', width: 390, height: 844 },
];

(async () => {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  let failed = false;

  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });

      for (const scrollY of [0, 250, 500]) {
        await page.evaluate((y) => window.scrollTo(0, y), scrollY);
        const state = await page.evaluate(() => {
          const hero = document.querySelector('.hero');
          const content = document.querySelector('.hero-content');
          const phone = document.querySelector('.hero-content a[href^="tel:"]');
          const heroRect = hero.getBoundingClientRect();
          const contentRect = content.getBoundingClientRect();
          const phoneRect = phone.getBoundingClientRect();
          const style = getComputedStyle(content);
          return {
            heroBottom: heroRect.bottom,
            contentBottom: contentRect.bottom,
            phoneBottom: phoneRect.bottom,
            opacity: style.opacity,
            transform: style.transform,
          };
        });

        const contained = state.contentBottom <= state.heroBottom + 1 &&
          state.phoneBottom <= state.heroBottom + 1;
        const anchored = state.opacity === '1' && state.transform === 'none';
        const passed = contained && anchored;
        failed ||= !passed;
        console.log(`${passed ? 'PASS' : 'FAIL'} ${viewport.name} scroll=${scrollY}`, state);
      }

      await page.close();
    }
  } finally {
    await browser.close();
  }

  if (failed) process.exitCode = 1;
})();
