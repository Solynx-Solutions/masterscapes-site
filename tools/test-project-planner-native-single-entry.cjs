const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.MS_PLAYWRIGHT_MODULE || 'playwright');

const baseUrl = process.env.MS_PREVIEW_BASE_URL || 'http://127.0.0.1:4173';
const surveyId = 'eC2FhSBs8UQw0imOhv5X';
const viewport = {
  width: Number(process.env.MS_VIEWPORT_WIDTH || 390),
  height: Number(process.env.MS_VIEWPORT_HEIGHT || 844)
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.MS_CHROME_PATH });
  const context = await browser.newContext({ viewport });
  const blockedWrites = [];
  await context.route('**/*', async route => {
    const request = route.request();
    if (!['GET', 'HEAD'].includes(request.method())) {
      blockedWrites.push(`${request.method()} ${request.url()}`);
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });

  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/project-planner/`, { waitUntil: 'networkidle', timeout: 45000 });
    const frame = page.frames().find(candidate => candidate.url().includes(`/widget/survey/${surveyId}`));
    assert(frame, 'planner embeds the verified native survey');
    assert(!frame.url().includes('single_dropdown_') && !frame.url().includes('checkbox_'), 'planner passes no outer-question answers to a second questionnaire');

    const introText = await frame.locator('body').innerText();
    assert(introText.includes('Welcome to the Master Scapes Luxury Project Planner'), 'native survey intro is visible');
    assert(!/survey(?:\s+is)?\s+(?:now\s+)?closed|stopped accepting responses|isn['’]t accepting responses/i.test(introText), 'native survey is publicly open');

    const next = () => frame.locator('[role="button"][aria-label="Next"]').click();
    const back = () => frame.locator('[role="button"][aria-label="Go Back"]').click();
    const pick = async value => {
      await frame.getByRole('combobox').click();
      await frame.getByRole('option', { name: value, exact: true }).click();
      await next();
    };

    await next();
    await pick('Luxury Patio');
    await frame.locator('input[type="checkbox"][value="Premium Pavers"]').check();
    await next();
    await pick('600–1,000 sq ft');
    await pick('$75,000 – $120,000');
    await pick('1–3 Months');

    await frame.locator('#full_name').fill('Planner QA');
    await frame.locator('#email').fill('planner-qa@example.com');
    await frame.locator('#phone').fill('+1 209-555-0100');
    await frame.locator('input[name="terms_and_conditions"]').check();
    const consentCopy = await frame.locator('body').innerText();
    assert(consentCopy.includes('No marketing or text-message consent is collected.'), 'native consent wording remains visible');
    assert(consentCopy.includes('Privacy Policy'), 'native privacy link remains visible');

    await next();
    const reviewText = await frame.locator('body').innerText();
    assert(reviewText.includes('Review your project request') || reviewText.includes('8 of 8'), 'native flow reaches final review without submitting');
    assert(await frame.getByRole('button', { name: /submit/i }).isVisible(), 'provider submit remains available but untouched');

    await back();
    assert(await frame.locator('#full_name').inputValue() === 'Planner QA', 'contact name is retained when returning from review');
    assert(await frame.locator('#email').inputValue() === 'planner-qa@example.com', 'contact email is retained when returning from review');
    const retainedPhone = (await frame.locator('#phone').inputValue()).replace(/\D/g, '');
    assert(retainedPhone.endsWith('2095550100'), 'contact phone is retained when returning from review');
    assert(await frame.locator('input[name="terms_and_conditions"]').isChecked(), 'consent choice is retained when returning from review');

    await back();
    assert((await frame.getByRole('combobox').innerText()).includes('1–3 Months'), 'timeline answer is retained');
    await back();
    assert((await frame.getByRole('combobox').innerText()).includes('$75,000 – $120,000'), 'investment answer is retained');
    await back();
    assert((await frame.getByRole('combobox').innerText()).includes('600–1,000 sq ft'), 'area answer is retained');
    await back();
    assert(await frame.locator('input[type="checkbox"][value="Premium Pavers"]').isChecked(), 'materials answer is retained');
    await back();
    assert((await frame.getByRole('combobox').innerText()).includes('Luxury Patio'), 'project-type answer is retained');

    assert(!blockedWrites.some(request => /\/forms\/submit(?:\?|$)/i.test(request)), 'verification emits no form submission');
    assert(blockedWrites.length > 0, 'provider background writes are blocked during verification');

    const screenshotDir = process.env.MS_PREVIEW_SCREENSHOTS || path.resolve(__dirname, '..', 'test-results', 'planner-native-single-entry');
    fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({ path: path.join(screenshotDir, `native-single-entry-${viewport.width}.png`), fullPage: true });
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
