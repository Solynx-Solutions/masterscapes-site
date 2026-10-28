# Master Scapes project planner receiver contract

Status: local candidate only. No receiver is configured, no delivery is active, and no live submission has been made.

## Browser-to-site boundary

The planner sends one `POST /api/project-planner-submit` request after the visitor reviews the plan and provides required contact consent. Text-message follow-up additionally requires SMS consent. The browser keeps the generated `submissionId` in memory and reuses it for a deliberate retry after an unconfirmed response.

The site adapter returns success only when the receiver returns an accepted durable receipt. A network response or an unstructured `2xx` response is not enough.

## Required Vercel configuration

All values must be supplied through the exact registered `masterscapes-site` project. Do not place values in source control.

- `MASTER_SCAPES_PLANNER_DELIVERY_ENABLED`: must equal `true` to enable delivery.
- `MASTER_SCAPES_PLANNER_WEBHOOK_URL`: governed HTTPS receiver URL. Private, local, credential-bearing, redirecting, or non-HTTPS URLs are rejected.
- `MASTER_SCAPES_FORM_WEBHOOK_SECRET`: at least 32 characters, shared with the receiver for HMAC verification.
- `MASTER_SCAPES_FORM_ALLOWED_ORIGINS`: comma-separated HTTPS origins. Configure only the verified Preview origin during controlled validation, then add the production origin for the approved release.
- `MASTER_SCAPES_PLATFORM_LOCATION_ID`: verified existing Master Scapes platform location.
- `MASTER_SCAPES_PLANNER_ASSIGNEE_USER_ID`: verified existing Matthew account. The receiver must assign to this user and must never create a user.

The current Vercel project has no environment variables, so activation must remain off until all six settings are supplied and read back.

## Site-to-receiver request

Headers:

- `content-type: application/json`
- `x-solynx-signature: sha256=<hex HMAC-SHA256 of the exact body>`
- `x-solynx-submission-id: <stable planner submission ID>`

Body:

```json
{
  "schema": "solynx.master-scapes.project-planner.v1",
  "submittedAt": "ISO-8601 timestamp",
  "submission": {
    "projectType": "approved planner option",
    "materials": ["one or more approved planner options"],
    "squareFootage": "approved planner option",
    "budget": "approved planner option",
    "timeline": "approved planner option",
    "contact": {
      "fullName": "visitor supplied",
      "phone": "visitor supplied",
      "email": "visitor supplied and normalized to lowercase",
      "location": "optional visitor supplied",
      "followup": "Phone | Email | Text message"
    },
    "consent": {
      "contact": true,
      "sms": false,
      "version": "masterscapes-project-contact-v1"
    },
    "submissionId": "stable idempotency key",
    "source": "master-scapes-project-planner",
    "sourcePage": "/project-planner/"
  },
  "routing": {
    "locationId": "configured existing location",
    "assigneeUserId": "configured existing Matthew user"
  }
}
```

## Receiver obligations

The receiver must complete every item before returning `accepted: true`:

1. Verify the HMAC against the exact request body and reject stale or invalid signatures.
2. Enforce the `submissionId` as a durable idempotency key. A retry must return the original receipt and must not create a second contact, opportunity, notification, SMS, or email.
3. Upsert the lead within the configured Master Scapes location using normalized phone/email matching. Preserve existing contacts, opportunities, Dennis administration, phone lines, workflows, and lead routes.
4. Assign the planner lead only to the configured existing Matthew user. Never create or invite a user from this request.
5. Store the planner answers and consent version with the lead. Do not calculate a score, fit label, or automated price.
6. Enforce abuse controls and the current SMS/contact-compliance policy. Text follow-up is not allowed when `submission.consent.sms` is false.
7. Commit durably before responding. Workflow logs or an accepted HTTP request alone are not a durable receipt.

Accepted response, including an idempotent duplicate:

```json
{
  "accepted": true,
  "receiptId": "stable-receiver-generated-id",
  "duplicate": false
}
```

For a replay of an already committed `submissionId`, return the same `receiptId` with `duplicate: true`.

Any validation, authentication, persistence, assignment, notification, or downstream failure must return a non-2xx response or `{ "accepted": false }`. Never return an accepted receipt before durable commit.

## Coordinated activation and verification

1. Hub confirms the existing Matthew identity, notification readback, phone routing, and the receiver mapping without changing other lines or routes.
2. Configure the candidate in Preview only and keep production delivery disabled.
3. Run one coordinated, explicitly designated synthetic submission. Verify the same correlation across browser response, receiver receipt, stored contact/lead, assignment, and intended notification. Confirm a replay returns the same receipt with no duplicate side effects.
4. Obtain a fresh independent Esther PASS for desktop, 390 CSS-pixel mobile, consent, success, and failure behavior.
5. Confirm the exact release diff and production rollback. Only then enable and promote the bounded production release.

No live or synthetic submission may be made concurrently with Hub platform changes.

## Rollback

Immediate delivery stop: set `MASTER_SCAPES_PLANNER_DELIVERY_ENABLED` to `false` and verify the adapter returns `planner_delivery_not_active` without forwarding.

Code rollback: redeploy the last verified production commit. Do not delete contacts, receipts, users, messages, or workflows as part of rollback; preserve records and reconcile them separately.
