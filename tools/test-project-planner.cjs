const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const homepage = read('index.html');
const plannerHtml = read('project-planner/index.html');
const plannerJs = read('project-planner/app.js');

const checks = [
  ['homepage exposes the approved planner CTA', homepage.includes('href="/project-planner/"') && homepage.includes('Plan Your Outdoor Project')],
  ['planner retains the approved quiz title', plannerHtml.includes('<title>Masterscapes Luxury Project Qualification Quiz</title>')],
  ['planner returns to the existing homepage', plannerHtml.includes('href="../"')],
  ['planner contains no submitting form', !/<form\b/i.test(plannerHtml + plannerJs)],
  ['planner contains no network-send primitive', !/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket)\s*\(/.test(plannerJs)],
  ['planner contains no browser persistence primitive', !/\b(localStorage|sessionStorage|indexedDB)\b/.test(plannerJs)],
  ['review remains editable', plannerJs.includes('data-edit="${stepIndex}"') && plannerJs.includes('currentStep = Number(button.dataset.edit)')],
  ['review states the no-score boundary', plannerJs.includes('does not calculate a score, assign a fit label, estimate pricing, or send these answers anywhere')],
  ['completion uses the approved close', plannerJs.includes('Let’s bring your outdoor vision to life.')],
  ['completion keeps the no-submission boundary', plannerJs.includes('No submission was created, no score was calculated, and no information left this planner.')],
  ['completion links only to the verified consultation route', plannerJs.includes('https://link.masterscapes.pro/widget/booking/v4JyGfcCJLQ7nWzjdIIM') && plannerJs.includes('Schedule My Project Consultation')]
];

let failures = 0;
for (const [label, passed] of checks) {
  if (passed) {
    console.log(`PASS ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL ${label}`);
  }
}

if (failures) {
  console.error(`\n${failures} project-planner check(s) failed.`);
  process.exit(1);
}

console.log(`\n${checks.length} project-planner checks passed.`);
