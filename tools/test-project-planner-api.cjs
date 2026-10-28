const assert = require('node:assert/strict')
const { createHmac } = require('node:crypto')
const handler = require('../api/project-planner-submit')

const originalFetch = global.fetch
const originalEnv = { ...process.env }
const validBody = {
  projectType: 'Luxury Patio',
  materials: ['Premium Pavers', 'Natural Stone'],
  squareFootage: '600-1,000 sq ft',
  budget: '$75,000 - $120,000',
  timeline: '1-3 Months',
  contact: {
    fullName: 'Synthetic Planner Test',
    phone: '209-555-0100',
    email: 'planner@example.invalid',
    location: 'Modesto, CA',
    followup: 'Email',
  },
  consent: { contact: true, sms: false, version: 'masterscapes-project-contact-v1' },
  submissionId: 'synthetic-planner-2026-0001',
  source: 'master-scapes-project-planner',
  sourcePage: '/project-planner/',
  website: '',
}

function resetEnv() {
  process.env = { ...originalEnv }
  process.env.MASTER_SCAPES_PLANNER_DELIVERY_ENABLED = 'true'
  process.env.MASTER_SCAPES_PLANNER_WEBHOOK_URL = 'https://receiver.example.invalid/intake'
  process.env.MASTER_SCAPES_FORM_WEBHOOK_SECRET = '0123456789abcdef0123456789abcdef'
  process.env.MASTER_SCAPES_FORM_ALLOWED_ORIGINS = 'https://www.masterscapes.pro'
  process.env.MASTER_SCAPES_PLATFORM_LOCATION_ID = 'location-test-0001'
  process.env.MASTER_SCAPES_PLANNER_ASSIGNEE_USER_ID = 'existing-user-test-0001'
}

async function run({ method = 'POST', origin = 'https://www.masterscapes.pro', body = validBody } = {}) {
  let statusCode
  let result
  const headers = {}
  const res = {
    status(value) { statusCode = value; return this },
    setHeader(name, value) { headers[name.toLowerCase()] = value },
    json(value) { result = value },
  }
  await handler({ method, headers: { origin, 'content-type': 'application/json' }, body }, res)
  return { statusCode, result, headers }
}

;(async () => {
  resetEnv()
  process.env.MASTER_SCAPES_PLANNER_DELIVERY_ENABLED = 'false'
  let response = await run()
  assert.equal(response.statusCode, 503)
  assert.equal(response.result.code, 'planner_delivery_not_active')

  resetEnv()
  delete process.env.MASTER_SCAPES_PLANNER_ASSIGNEE_USER_ID
  response = await run()
  assert.equal(response.statusCode, 503)
  assert.equal(response.result.code, 'planner_delivery_not_configured')

  resetEnv()
  response = await run({ origin: 'https://evil.example' })
  assert.equal(response.statusCode, 403)

  resetEnv()
  response = await run({ body: { ...validBody, consent: { ...validBody.consent, contact: false } } })
  assert.equal(response.statusCode, 422)

  resetEnv()
  response = await run({ body: { ...validBody, contact: { ...validBody.contact, followup: 'Text message' } } })
  assert.equal(response.statusCode, 422)

  resetEnv()
  let captured
  global.fetch = async (url, options) => {
    captured = { url, options }
    return { ok: true, status: 202, json: async () => ({ accepted: true, receiptId: 'MSPLAN-SYNTHETIC-0001', duplicate: false }) }
  }
  response = await run()
  assert.equal(response.statusCode, 202)
  assert.deepEqual(response.result, { accepted: true, receiptId: 'MSPLAN-SYNTHETIC-0001', duplicate: false })
  assert.equal(captured.url, 'https://receiver.example.invalid/intake')
  assert.equal(captured.options.headers['x-solynx-submission-id'], validBody.submissionId)
  const expectedSignature = createHmac('sha256', process.env.MASTER_SCAPES_FORM_WEBHOOK_SECRET).update(captured.options.body).digest('hex')
  assert.equal(captured.options.headers['x-solynx-signature'], `sha256=${expectedSignature}`)
  const forwarded = JSON.parse(captured.options.body)
  assert.equal(forwarded.routing.assigneeUserId, 'existing-user-test-0001')
  assert.equal(forwarded.routing.locationId, 'location-test-0001')
  assert.equal(forwarded.submission.contact.email, 'planner@example.invalid')

  global.fetch = async () => ({ ok: true, status: 202, json: async () => ({ accepted: true }) })
  response = await run()
  assert.equal(response.statusCode, 502)
  assert.equal(response.result.code, 'delivery_unconfirmed')

  global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ accepted: true, receiptId: 'MSPLAN-SYNTHETIC-0001', duplicate: true }) })
  response = await run()
  assert.equal(response.statusCode, 202)
  assert.equal(response.result.duplicate, true)

  global.fetch = async () => { throw new Error('synthetic unavailable') }
  response = await run()
  assert.equal(response.statusCode, 502)
  assert.equal(response.result.code, 'delivery_unavailable')

  console.log('9 project-planner adapter controls passed')
})().finally(() => {
  global.fetch = originalFetch
  process.env = originalEnv
}).catch(error => {
  console.error(error)
  process.exit(1)
})
