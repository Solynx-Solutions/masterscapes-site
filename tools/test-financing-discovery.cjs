const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const navFiles = [
  'index.html',
  'projects.html',
  'careers.html',
  'pavers-modesto.html',
  'pavers-manteca.html',
  'pavers-turlock.html',
  'sales/index.html'
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
}

for (const file of navFiles) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  assert(/<a[^>]+href="(?:\/|index\.html)?#financing"[^>]*class="nav-link"[^>]*>Financing<\/a>/.test(html), `${file} exposes Financing in the shared navigation`);
}

const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const noticeRule = css.match(/\.financing-notice\s*\{([^}]*)\}/)?.[1] || '';

assert(script.includes("ms_financing_notice_dismissed"), 'dismissal persists for the browser session');
assert(script.includes("aria-label', 'Financing available'"), 'notice has an accessible label');
assert(script.includes('Dismiss financing notice'), 'notice exposes an accessible dismiss control');
assert(script.includes("document.getElementById('financing') ? '#financing' : '/#financing'"), 'notice routes to the existing financing section from every shared page');
assert(css.includes('@media (prefers-reduced-motion: reduce)'), 'notice honors reduced-motion preference');
assert(/\.financing-notice\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?top:\s*calc\(var\(--nav-height\)/.test(css), 'notice is a compact upper-corner component');
assert(!/(?:inset:\s*0|(?:^|\n)\s*(?:width|height):\s*100(?:vw|vh|%))/m.test(noticeRule), 'notice is not fullscreen');
