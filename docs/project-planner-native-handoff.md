# Master Scapes native planner handoff

Status: protected Preview candidate. The checked-in configuration uses `mode: "native"` with the verified replacement survey `eC2FhSBs8UQw0imOhv5X`. Production remains unchanged pending independent review and release verification.

## Exact non-PII prefill mapping

The field IDs and picklists were read from the authorized Master Scapes location. Hub read the separate Query Keys from the native survey builder.

| Planner answer | CRM field ID | Native Query Key | Candidate behavior |
| --- | --- | --- | --- |
| Project type | `CkWastedTxWyJdWkU4cd` | `single_dropdown_3mln` | Prefill exact single option; keep visible |
| Materials | `Wz7HTTdcldsbo8Aruyre` | `checkbox_1828` | A single direct value prefills; keep visible and do not prefill multi-select answers until multi-value encoding is proven |
| Approximate area | `veklJyvvxN40VVIzuGRT` | `single_dropdown_491j` | Prefill exact single option; keep visible |
| Investment range | `rmYDGdTupy321IBFFg5P` | `single_dropdown_4q2j` | Prefill exact single option; keep visible |
| Timeline | `poNzfboICCtGqSpTeRI6` | `single_dropdown_4kx2` | Prefill exact single option; keep visible |

The custom planner never adds name, email, phone, address, project location, or consent to the iframe URL. Those values must be entered visibly in the native provider surface.

## Verified Hub configuration

1. The active replacement survey is `eC2FhSBs8UQw0imOhv5X`. Its public intro, privacy link, consent, required contact fields, final review copy, and provider-owned completion state were read back after save.
2. All five project fields remain visible. Project type, approximate area, investment range, and timeline have verified exact-value prefill in Preview. Materials remains visible and user-confirmed because multi-value checkbox URL encoding is not proven.
3. Native name, email, and phone are required. The initial native route is phone/email only and does not offer text-message follow-up or collect SMS marketing consent.
4. Required project phone/email contact consent explicitly excludes marketing text enrollment and links `https://www.masterscapes.pro/privacy.html`.
5. The provider-owned thank-you state confirms receipt and includes only the verified consultation URL: `https://link.masterscapes.pro/widget/booking/v4JyGfcCJLQ7nWzjdIIM`.
6. Notification settings were read back for `prosales.lifestyle1@gmail.com` and `mel@solynx.solutions`, subject `New MasterScapes project consultation request`, with the submission PDF/full answers. This proves configuration only, not delivery or CRM ownership.
7. `project-planner/submission-config.js` uses `mode: "native"`; `native.enabled` and the verified flags are `true`. The protected hosted Preview must pass independent verification before production promotion.

The retired survey `Tp94Vzomz8umXh1V9zgW` is not referenced by the candidate. Preserve its artifact and submission history; keep it closed rather than deleting it.

## Acceptance and live test

The provider iframe owns contact entry, consent, submission, and its success state. The parent page does not listen for or invent a success event. A coordinated live test must verify the native thank-you, persisted submission/contact answers, and actual email delivery to the intended recipients. Email notification does not prove that the CRM contact owner or assignee changed.

## Rollback

Set `mode` back to `"disabled"` or deploy the prior production commit. Do not delete native submissions, contacts, messages, or notification records during rollback.
