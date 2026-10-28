const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.MS_PLAYWRIGHT_MODULE || 'playwright');

const baseUrl = process.env.MS_PREVIEW_BASE_URL || 'http://127.0.0.1:4173';
const screenshotDir = process.env.MS_PREVIEW_SCREENSHOTS || path.resolve(__dirname, '..', 'test-results');
fs.mkdirSync(screenshotDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
}

async function runFlow(browser, name, viewport, deliverySucceeds = true) {
  const context = await browser.newContext({ viewport });
  const submissions = [];
  await context.route('**/*', async route => {
    const request = route.request();
    const url = request.url();
    if (url === `${baseUrl}/api/project-planner-submit` && request.method() === 'POST') {
      submissions.push(request.postDataJSON());
      return route.fulfill({
        status: deliverySucceeds ? 202 : 502,
        contentType: 'application/json',
        body: JSON.stringify(deliverySucceeds
          ? { accepted: true, receiptId: `MS-PLAN-${name.toUpperCase().replace(/[^A-Z0-9]/g, '-')}-0001`, duplicate: false }
          : { accepted: false, code: 'delivery_unavailable' })
      });
    }
    if (url.startsWith(baseUrl)) return route.continue();
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  const pageErrors = [];
  const writes = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => {
    if (!['GET', 'HEAD'].includes(request.method())) writes.push(`${request.method()} ${request.url()}`);
  });

  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  const homeCta = page.locator('.hero-primary');
  assert((await homeCta.textContent()).includes('Plan Your Outdoor Project'), `${name} homepage shows the approved CTA`);
  assert(await homeCta.getAttribute('href') === '/project-planner/', `${name} homepage CTA targets the planner route`);
  await page.screenshot({ path: path.join(screenshotDir, `${name}-homepage.png`), fullPage: true });

  await homeCta.click();
  await page.waitForURL('**/project-planner/');
  assert(await page.title() === 'Masterscapes Luxury Project Qualification Quiz', `${name} planner uses the approved title`);
  await page.getByRole('button', { name: 'Plan my project' }).click();

  await page.getByRole('button', { name: 'Continue' }).click();
  assert((await page.getByRole('alert').textContent()).includes('Please select an option'), `${name} required-choice validation is visible`);

  await page.getByRole('button', { name: 'Luxury Patio' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Premium Pavers' }).click();
  await page.getByRole('button', { name: 'Natural Stone' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: '600-1,000 sq ft' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: '$75,000 - $120,000' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: '1-3 Months' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Full name').fill('Preview Reviewer');
  await page.getByLabel('Phone number').fill('209-555-0100');
  await page.getByLabel('Email address').fill('preview@example.com');
  await page.getByLabel('Project location').fill('Modesto, CA');
  await page.getByRole('button', { name: 'Continue' }).click();
  assert((await page.getByRole('alert').textContent()).includes('preferred follow-up'), `${name} follow-up validation is visible`);
  await page.getByRole('button', { name: 'Email', exact: true }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  assert(await page.getByRole('heading', { name: 'Review your project plan' }).isVisible(), `${name} reaches the editable summary`);
  assert((await page.locator('.summary-grid').textContent()).includes('Preview Reviewer'), `${name} summary preserves entered contact details`);
  const projectCard = page.locator('.summary-card').filter({ hasText: 'Project type' });
  await projectCard.getByRole('button', { name: 'Change' }).click();
  await page.getByRole('button', { name: 'High-End Driveway' }).click();
  for (let index = 0; index < 6; index += 1) {
    await page.getByRole('button', { name: 'Continue' }).click();
  }
  assert((await page.locator('.summary-grid').textContent()).includes('High-End Driveway'), `${name} edited answer survives return to summary`);
  await page.screenshot({ path: path.join(screenshotDir, `${name}-review.png`), fullPage: true });

  await page.getByRole('button', { name: 'Submit project plan' }).click();
  assert((await page.getByRole('alert').textContent()).includes('confirm that Master Scapes may contact you'), `${name} blocks submission without contact consent`);
  assert(writes.length === 0, `${name} emits no write before consent`);
  await page.locator('#contactConsent').check();
  await page.getByRole('button', { name: 'Submit project plan' }).click();

  assert(submissions.length === 1, `${name} sends exactly one planner payload`);
  assert(submissions[0].consent.contact === true, `${name} sends explicit contact consent`);
  assert(submissions[0].consent.sms === false, `${name} does not invent SMS consent`);
  assert(/^[a-zA-Z0-9-]{16,80}$/.test(submissions[0].submissionId), `${name} sends an idempotency key`);

  if (deliverySucceeds) {
    await page.getByRole('heading', { name: 'Let’s bring your outdoor vision to life.' }).waitFor({ state: 'visible' });
    assert(true, `${name} shows the approved completion close after acceptance`);
    const consultation = page.getByRole('link', { name: 'Schedule My Project Consultation' });
    assert((await consultation.getAttribute('href')).endsWith('/widget/booking/v4JyGfcCJLQ7nWzjdIIM'), `${name} uses the verified consultation route`);
    assert((await page.locator('.completion-boundary').textContent()).includes('Confirmation: MS-PLAN-'), `${name} shows the durable receipt`);
    assert((await page.locator('.completion-boundary').textContent()).includes('No score or automated pricing estimate'), `${name} preserves the no-score boundary`);
    await page.screenshot({ path: path.join(screenshotDir, `${name}-completion.png`), fullPage: true });
  } else {
    await page.getByRole('alert').filter({ hasText: 'has not been marked received' }).waitFor({ state: 'visible' });
    assert(await page.getByRole('heading', { name: 'Review your project plan' }).isVisible(), `${name} remains on review after failed delivery`);
    assert((await page.getByRole('alert').textContent()).includes('has not been marked received'), `${name} reports failed delivery truthfully`);
    assert(await page.getByRole('button', { name: 'Submit project plan' }).isEnabled(), `${name} permits a deliberate retry`);
    assert(await page.getByText('Project plan received').count() === 0, `${name} does not show a false success state`);
    await page.screenshot({ path: path.join(screenshotDir, `${name}-delivery-failure.png`), fullPage: true });
  }

  assert(writes.length === 1 && writes[0].startsWith('POST '), `${name} walkthrough emits only the expected POST`);
  const storage = await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }));
  assert(storage.local === 0 && storage.session === 0, `${name} leaves browser storage empty`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${name} has no visible horizontal overflow`);
  assert(pageErrors.length === 0, `${name} walkthrough has no page errors`);
  await context.close();
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.MS_CHROME_PATH
  });
  try {
    await runFlow(browser, 'desktop', { width: 1440, height: 1000 });
    await runFlow(browser, 'mobile', { width: 390, height: 844 });
    await runFlow(browser, 'mobile-failure', { width: 390, height: 844 }, false);
  } finally {
    await browser.close();
  }
  console.log('\nDesktop and mobile project-planner walkthroughs passed.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
