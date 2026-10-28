const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const homepage = read('index.html');
const plannerHtml = read('project-planner/index.html');
const plannerJs = read('project-planner/app.js');
const submissionConfig = read('project-planner/submission-config.js');
const plannerApi = read('api/project-planner-submit.js');

const checks = [
  ['homepage exposes the approved planner CTA', homepage.includes('href="/project-planner/"') && homepage.includes('Plan Your Outdoor Project')],
  ['planner retains the approved quiz title', plannerHtml.includes('<title>Masterscapes Luxury Project Qualification Quiz</title>')],
  ['planner returns to the existing homepage', plannerHtml.includes('href="../"')],
  ['planner submits only to the first-party adapter', plannerJs.includes('fetch("/api/project-planner-submit"') && !/fetch\(["']https?:/i.test(plannerJs)],
  ['native handoff is disabled by default', submissionConfig.includes('mode: "disabled"') && submissionConfig.includes('enabled: false')],
  ['native handoff uses all verified query keys', ['single_dropdown_3mln', 'checkbox_1828', 'single_dropdown_491j', 'single_dropdown_4q2j', 'single_dropdown_4kx2'].every(key => submissionConfig.includes(key))],
  ['materials prefill remains off until encoding is proven', submissionConfig.includes('materialsPrefill') && submissionConfig.includes('encoding: "unverified"')],
  ['native URL excludes personal and consent fields', !/(fullName|phone|email|location|consent):\s*["'](?:single_|checkbox_)/.test(submissionConfig) && plannerJs.includes('No personal information or consent was added')],
  ['native provider owns submission success', plannerJs.includes('Receipt is confirmed inside that form') && !plannerJs.includes('addEventListener("message"')],
  ['planner contains no browser persistence primitive', !/\b(localStorage|sessionStorage|indexedDB)\b/.test(plannerJs)],
  ['review remains editable', plannerJs.includes('data-edit="${stepIndex}"') && plannerJs.includes('currentStep = Number(button.dataset.edit)')],
  ['review states the no-score boundary', plannerJs.includes('does not calculate a score, assign a fit label, or estimate pricing')],
  ['planner requires contact consent', plannerJs.includes('contactConsent') && plannerJs.includes('Please confirm that Master Scapes may contact you')],
  ['planner requires SMS consent for text follow-up', plannerJs.includes('Reply STOP to unsubscribe or HELP for help') && plannerJs.includes('answers.contact.followup === "Text message" && !answers.consent.sms')],
  ['completion uses the approved close', plannerJs.includes('Let’s bring your outdoor vision to life.')],
  ['completion requires a durable receipt', plannerJs.includes('typeof result.receiptId !== "string"') && plannerJs.includes('Project plan received')],
  ['failure copy does not claim receipt', plannerJs.includes('Your plan has not been marked received')],
  ['adapter fails closed until activated', plannerApi.includes("MASTER_SCAPES_PLANNER_DELIVERY_ENABLED !== 'true'")],
  ['adapter signs and deduplicates by submission ID', plannerApi.includes("createHmac('sha256'") && plannerApi.includes("'x-solynx-submission-id': payload.submissionId")],
  ['adapter requires configured routing', plannerApi.includes('MASTER_SCAPES_PLATFORM_LOCATION_ID') && plannerApi.includes('MASTER_SCAPES_PLANNER_ASSIGNEE_USER_ID')],
  ['adapter requires accepted durable receipt', plannerApi.includes("upstreamBody.accepted !== true") && plannerApi.includes('receiptId')],
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
