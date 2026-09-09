const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

let passed = 0;
const check = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
  passed += 1;
  console.log(`PASS ${message}`);
};

const config = JSON.parse(read('vercel.preview.json'));
const catchAll = config.headers?.find((rule) => rule.source === '/(.*)');
const headerMap = new Map(
  (catchAll?.headers || []).map((header) => [
    header.key.toLowerCase(),
    header.value.toLowerCase(),
  ]),
);
const robotsRewrite = config.rewrites?.find(
  (rule) => rule.source === '/robots.txt',
);

check(Boolean(catchAll), 'preview config has one catch-all header policy');
check(
  headerMap.get('x-robots-tag') ===
    'noindex, nofollow, noarchive, nosnippet',
  'all preview responses receive the required X-Robots-Tag',
);
check(
  headerMap.get('cache-control') === 'private, no-store, max-age=0',
  'preview responses are private and not stored',
);
check(
  robotsRewrite?.destination === '/robots-preview.txt',
  'preview robots route rewrites to the disallow-all file',
);
check(
  `${read('robots-preview.txt').replace(/\r\n/g, '\n').trimEnd()}\n` ===
    'User-agent: *\nDisallow: /\n',
  'preview robots file disallows all crawling',
);

const publicRoutes = [
  'index.html',
  'careers.html',
  'pavers-manteca.html',
  'pavers-modesto.html',
  'pavers-turlock.html',
  'projects.html',
  'privacy.html',
  'terms.html',
  'sales/index.html',
];

for (const route of publicRoutes) {
  const html = read(route);
  check(/<title>[^<]+<\/title>/i.test(html), `${route} has a page title`);
  check(/<h1(?:\s|>)/i.test(html), `${route} has a primary heading`);
  check(/class=["']nav-identity["']/i.test(html), `${route} retains the premium navigation identity`);
  check(/class=["']nav-sales-contact["'][^>]+href=["']tel:\+12098857098["']/i.test(html), `${route} exposes the verified dedicated sales line`);
}

const failClosedRoutes = [
  'index.html',
  'pavers-manteca.html',
  'pavers-modesto.html',
  'pavers-turlock.html',
];

const forbidden = [
  /CONTRACTOR_WEBHOOK_ID/i,
  /example\.com\/webhook/i,
  /form[^\n]{0,80}(?:submitted|successfully sent)/i,
];

for (const route of failClosedRoutes) {
  const html = read(route);
  check(!/<form(?:\s|>)/i.test(html), `${route} has no public form`);
  check(
    /data-delivery-state=["']secure-channel-required["']/i.test(html),
    `${route} exposes the truthful fail-closed state`,
  );
  for (const pattern of forbidden) {
    check(!pattern.test(html), `${route} contains no forbidden placeholder`);
  }
}

const careers = read('careers.html');
check(/<form[^>]+id=["']contractorApplicationForm["']/i.test(careers), 'careers.html contains the controlled subcontractor application');
check(!/action=["']?https?:/i.test(careers), 'careers.html exposes no third-party form destination');
check(/data-delivery-state=["']controlled["']/i.test(careers), 'careers.html marks the controlled delivery state');
check(/does not enroll you in marketing or text messages/i.test(careers), 'careers.html preserves the narrow contact-consent boundary');
for (const pattern of forbidden) {
  check(!pattern.test(careers), 'careers.html contains no forbidden placeholder');
}

for (const route of [
  'index.html',
  'pavers-manteca.html',
  'pavers-modesto.html',
  'pavers-turlock.html',
]) {
  check(/href=["'](?:\.\/|\/)?sales\/?["']/i.test(read(route)), `${route} retains the sales route`);
}

check(
  !/--prod|promote|alias|domains?|env\s/i.test(read('vercel.preview.json')),
  'preview config contains no production, alias, domain, or environment action',
);

console.log(`\n${passed} preview-hardening checks passed.`);
