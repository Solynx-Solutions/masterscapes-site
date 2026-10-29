const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.MS_PLAYWRIGHT_MODULE || 'playwright');

const surveyBase = 'https://link.masterscapes.pro/widget/survey/eC2FhSBs8UQw0imOhv5X';
const expected = {
  single_dropdown_3mln: 'Luxury Patio',
  single_dropdown_491j: '600–1,000 sq ft',
  single_dropdown_4q2j: '$75,000 – $120,000',
  single_dropdown_4kx2: '1–3 Months'
};
const url = new URL(surveyBase);
Object.entries(expected).forEach(([key, value]) => url.searchParams.set(key, value));
url.searchParams.set('checkbox_1828', 'Premium Pavers');
url.searchParams.set('source', 'Master Scapes Project Planner');

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.MS_CHROME_PATH });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const writes = [];
  await context.route('**/*', async route => {
    const method = route.request().method();
    if (!['GET', 'HEAD'].includes(method)) {
      writes.push(`${method} ${route.request().url()}`);
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  const page = await context.newPage();
  try {
    await page.goto(url.toString(), { waitUntil: 'networkidle', timeout: 30000 });
    const publicText = await page.locator('body').innerText();
    assert(
      !/survey(?:\s+is)?\s+(?:now\s+)?closed|stopped accepting responses|isn['’]t accepting responses/i.test(publicText),
      'native survey is publicly open'
    );

    const fieldState = [];
    const slideTexts = [];
    for (let slide = 0; slide < 8; slide += 1) {
      slideTexts.push(await page.locator('body').innerText());
      fieldState.push(...await page.locator('input, select, textarea').evaluateAll(elements => elements.map(element => ({
        tag: element.tagName,
        type: element.getAttribute('type') || '',
        name: element.getAttribute('name') || '',
        id: element.id || '',
        value: element.value || '',
        checked: Boolean(element.checked),
        visible: Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length),
        label: element.getAttribute('aria-label') || '',
        text: element.closest('label')?.innerText || ''
      }))));
      const visibleButtons = await page.locator('button:visible').allTextContents().catch(() => []);
      if (visibleButtons.some(label => /submit/i.test(label))) break;
      const advance = page.getByRole('button', { name: /next|start|continue/i }).last();
      if (!await advance.count()) break;
      await advance.click();
      await page.waitForTimeout(300);
    }

    const serialized = JSON.stringify(fieldState);
    const slideText = slideTexts.join('\n');
    assert(slideText.includes('Luxury Patio'), 'native survey prefills project type');
    assert(slideText.includes('600–1,000 sq ft'), 'native survey prefills approximate area');
    assert(slideText.includes('$75,000 – $120,000'), 'native survey prefills investment range');
    assert(slideText.includes('1–3 Months'), 'native survey prefills timeline');
    const premiumChecked = fieldState.some(field => field.checked && (field.value === 'Premium Pavers' || field.text.includes('Premium Pavers')));
    assert(premiumChecked, 'native survey prefills one material with a direct Query Key value');
    assert(!serialized.includes('preview@example.com') && !serialized.includes('209-555'), 'prefill check contains no personal test data');
    assert(!writes.some(request => /\/forms\/submit(?:\?|$)/i.test(request)), 'prefill check emits no form submission');
    assert(writes.length > 0, 'prefill check blocks provider write requests while traversing slides');

    const screenshotDir = process.env.MS_PREVIEW_SCREENSHOTS || path.resolve(__dirname, '..', 'test-results', 'planner-native-candidate');
    fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({ path: path.join(screenshotDir, 'native-prefill-390.png'), fullPage: true });
    console.log(`PREFILL_URL ${url.toString()}`);
    assert(!/demo only/i.test(slideTexts[0]), 'public native intro uses live copy rather than demo copy');
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
