const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const planner = [
  fs.readFileSync(path.join(root, 'project-planner', 'index.html'), 'utf8'),
  fs.readFileSync(path.join(root, 'project-planner', 'app.js'), 'utf8'),
  fs.readFileSync(path.join(root, 'project-planner', 'submission-config.js'), 'utf8')
].join('\n');

const hearth = 'https://app.gethearth.com/partners/top-flight-services/dennis/apply';
const hfs = 'https://www.hfsfinancial.net/promo/690e587831e1eeb8894b2c4d';

const checks = [
  ['homepage includes a dedicated financing section', homepage.includes('id="financing"') && homepage.includes('FINANCING OPTIONS')],
  ['homepage uses Matt-provided Hearth destination', homepage.includes(`href="${hearth}"`)],
  ['homepage uses Matt-provided HFS destination', homepage.includes(`href="${hfs}"`)],
  ['provider links open safely in a new tab', (homepage.match(/class="btn btn-primary financing-link"[^>]+target="_blank"[^>]+rel="noopener noreferrer"/g) || []).length === 2],
  ['financing remains on the website rather than in the planner', !planner.includes(hearth) && !planner.includes(hfs)],
  ['copy does not promise rates or approval', !/guaranteed|instant approval|pre-approved|monthly payment|interest rate|\bAPR\b/i.test(homepage)],
  ['copy identifies third-party decision boundary', homepage.includes('Eligibility, terms, and approval are determined by the provider') && homepage.includes('Master Scapes does not make credit decisions')]
];

let failures = 0;
for (const [label, passed] of checks) {
  if (passed) console.log(`PASS ${label}`);
  else {
    failures += 1;
    console.error(`FAIL ${label}`);
  }
}

if (failures) process.exit(1);
console.log(`\n${checks.length} financing checks passed.`);
