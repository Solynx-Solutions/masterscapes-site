const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = (process.argv[2] || 'http://127.0.0.1:4173').replace(/\/$/, '');
const outputDir = path.resolve(process.argv[3] || 'qa/preview-hardening');
const chromePath =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const routes = [
  '/',
  '/careers.html',
  '/pavers-manteca.html',
  '/pavers-modesto.html',
  '/pavers-turlock.html',
  '/projects.html',
  '/privacy.html',
  '/terms.html',
  '/sales/',
];
const failClosedRoutes = new Set([
  '/',
  '/careers.html',
  '/pavers-manteca.html',
  '/pavers-modesto.html',
  '/pavers-turlock.html',
]);
const salesRoutes = new Set([
  '/',
  '/pavers-manteca.html',
  '/pavers-modesto.html',
  '/pavers-turlock.html',
]);
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
];

fs.mkdirSync(outputDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });
  const results = [];

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: Boolean(viewport.isMobile),
      });
      const page = await context.newPage();
      const pageErrors = [];
      const consoleErrors = [];
      const sameOriginFailures = [];

      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleErrors.push({
            text: message.text(),
            url: message.location().url || '',
          });
        }
      });
      page.on('requestfailed', (request) => {
        if (request.url().startsWith(baseUrl)) {
          sameOriginFailures.push(`${request.url()} :: ${request.failure()?.errorText}`);
        }
      });

      for (const route of routes) {
        pageErrors.length = 0;
        consoleErrors.length = 0;
        sameOriginFailures.length = 0;
        const response = await page.goto(`${baseUrl}${route}`, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
        await page.waitForTimeout(300);
        if (route === '/') {
          const scrollHeight = await page.evaluate(
            () => document.documentElement.scrollHeight,
          );
          const step = Math.max(Math.floor(viewport.height * 0.7), 300);
          for (let y = 0; y < scrollHeight; y += step) {
            await page.mouse.wheel(0, step);
            await page.waitForTimeout(120);
          }
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(1200);
        }
        const dom = await page.evaluate(() => {
          const ownOrigin = window.location.origin;
          const brokenLocalImages = [...document.images]
            .filter((image) => {
              try {
                return new URL(image.currentSrc || image.src, document.baseURI).origin === ownOrigin;
              } catch {
                return false;
              }
            })
            .filter((image) => image.complete && image.naturalWidth === 0)
            .map((image) => image.currentSrc || image.src);
          const visibleTracked = [
            ...document.querySelectorAll('h1,h2,p,a,button,[data-delivery-state]'),
          ].filter((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0;
          });
          const clipped = visibleTracked
            .filter((element) => {
              const rect = element.getBoundingClientRect();
              return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1;
            })
            .map((element) => `${element.tagName}:${element.textContent.trim().slice(0, 80)}`);
          return {
            title: document.title,
            bodyLength: document.body.innerText.trim().length,
            h1: document.querySelector('h1')?.textContent.trim() || '',
            formCount: document.querySelectorAll('form').length,
            failClosedCount: document.querySelectorAll(
              '[data-delivery-state="secure-channel-required"]',
            ).length,
            salesLinkCount: [...document.querySelectorAll('a[href]')].filter((anchor) => {
              const href = anchor.getAttribute('href') || '';
              return /^(?:\.\/|\/)?sales\/?$/.test(href);
            }).length,
            hasPlaceholder: /CONTRACTOR_WEBHOOK_ID|example\.com\/webhook|placeholder webhook/i.test(
              document.documentElement.innerHTML,
            ),
            hasOverlay: Boolean(
              document.querySelector(
                '[data-nextjs-dialog],.vite-error-overlay,#webpack-dev-server-client-overlay',
              ),
            ),
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            clipped,
            brokenLocalImages,
            revealCount: document.querySelectorAll('.reveal').length,
            activeRevealCount: document.querySelectorAll('.reveal.active').length,
          };
        });
        const failures = [];
        if (!response || response.status() !== 200) failures.push(`HTTP ${response?.status()}`);
        if (!dom.title || !dom.h1 || dom.bodyLength < 100) failures.push('missing meaningful content');
        if (dom.scrollWidth > dom.clientWidth + 1) failures.push('document horizontal overflow');
        if (dom.clipped.length) failures.push(`clipped tracked elements: ${dom.clipped.join(' | ')}`);
        if (dom.brokenLocalImages.length) failures.push(`broken local images: ${dom.brokenLocalImages.join(', ')}`);
        if (dom.hasOverlay) failures.push('framework error overlay');
        if (route === '/' && dom.activeRevealCount !== dom.revealCount) {
          failures.push(
            `inactive reveal elements: ${dom.revealCount - dom.activeRevealCount}`,
          );
        }
        const sameOriginConsoleErrors = consoleErrors.filter(
          (error) => error.url && error.url.startsWith(baseUrl),
        );
        if (pageErrors.length) failures.push(`page errors: ${pageErrors.join(' | ')}`);
        if (sameOriginConsoleErrors.length) {
          failures.push(
            `same-origin console errors: ${sameOriginConsoleErrors
              .map((error) => `${error.url} :: ${error.text}`)
              .join(' | ')}`,
          );
        }
        if (sameOriginFailures.length) failures.push(`same-origin failures: ${sameOriginFailures.join(' | ')}`);
        if (failClosedRoutes.has(route)) {
          if (dom.formCount !== 0) failures.push(`expected 0 forms, found ${dom.formCount}`);
          if (dom.failClosedCount !== 1) failures.push(`expected 1 fail-closed state, found ${dom.failClosedCount}`);
          if (dom.hasPlaceholder) failures.push('placeholder receiver text found');
        }
        if (salesRoutes.has(route) && dom.salesLinkCount < 1) failures.push('sales route missing');

        results.push({
          viewport: viewport.name,
          route,
          status: response?.status(),
          ...dom,
          pageErrors: [...pageErrors],
          consoleErrors: [...consoleErrors],
          sameOriginConsoleErrors,
          sameOriginFailures: [...sameOriginFailures],
          failures,
        });

        if (route === '/') {
          await page.screenshot({
            path: path.join(outputDir, `masterscapes-home-${viewport.name}.png`),
            fullPage: true,
          });
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const report = {
    baseUrl,
    generatedAt: new Date().toISOString(),
    viewports,
    results,
    summary: {
      checks: results.length,
      failures: results.filter((result) => result.failures.length > 0).length,
      consoleErrorRoutes: results.filter((result) => result.consoleErrors.length > 0).length,
      sameOriginConsoleErrorRoutes: results.filter(
        (result) => result.sameOriginConsoleErrors.length > 0,
      ).length,
    },
  };
  fs.writeFileSync(
    path.join(outputDir, 'browser-qa.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  for (const result of results) {
    console.log(
      `${result.failures.length ? 'FAIL' : 'PASS'} ${result.viewport} ${result.route}`,
    );
    for (const failure of result.failures) console.log(`  - ${failure}`);
  }
  console.log(
    `\n${report.summary.checks} route/viewport checks; ${report.summary.failures} failures; ${report.summary.sameOriginConsoleErrorRoutes} routes emitted same-origin console errors; ${report.summary.consoleErrorRoutes} routes emitted any console error.`,
  );
  if (report.summary.failures) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
