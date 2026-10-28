# Master Scapes native planner handoff

Status: safe local hybrid candidate. The public planner is not activated by this file. The checked-in configuration remains `mode: "disabled"` and the existing native survey remains closed until Hub completes and reads back the settings below.

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

## Minimum Hub activation steps

1. Replace the demo/closed language, remove the example.com privacy link, and reopen the exact survey `Tp94Vzomz8umXh1V9zgW`.
2. Keep all five project fields visible until each prefill is verified in Preview. Materials must remain visible and user-confirmed until the provider's checkbox URL encoding is proven without submitting.
3. Require native name, email, and phone. Keep project address optional. The initial native route is phone/email only; do not offer text-message follow-up without a separate compliant SMS consent control.
4. Replace the demo terms block with required project phone/email contact consent that explicitly does not enroll the visitor in marketing text messages. Link the real Master Scapes privacy policy. SMS is not an initial-launch dependency because the native path does not offer text-message follow-up.
5. Configure the provider-owned thank-you state to confirm receipt and include only the verified consultation URL: `https://link.masterscapes.pro/widget/booking/v4JyGfcCJLQ7nWzjdIIM`.
6. Read back native notifications to `prosales.lifestyle1@gmail.com` and `mel@solynx.solutions`, subject `New MasterScapes project consultation request`, with the submission PDF/full answers. This proves configuration only, not delivery or CRM ownership.
7. After Hub readback, change `project-planner/submission-config.js` to `mode: "native"`, set `native.enabled` and each verified flag to `true`, then run Preview verification before production.

## Acceptance and live test

The provider iframe owns contact entry, consent, submission, and its success state. The parent page does not listen for or invent a success event. A coordinated live test must verify the native thank-you, persisted submission/contact answers, and actual email delivery to the intended recipients. Email notification does not prove that the CRM contact owner or assignee changed.

## Rollback

Set `mode` back to `"disabled"` or deploy the prior production commit. Do not delete native submissions, contacts, messages, or notification records during rollback.
