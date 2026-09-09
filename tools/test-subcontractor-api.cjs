const assert = require('node:assert/strict')
const handler = require('../api/subcontractor-interest')

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value },
    json(body) { this.body = body; return this },
  }
}

async function run(req) {
  const res = response()
  await handler(req, res)
  return res
}

const validBody = {
  name: 'Synthetic Contractor',
  businessName: 'Synthetic Crew',
  phone: '209-555-0100',
  email: 'contractor@example.invalid',
  trade: 'hardscape-pavers',
  experience: '6-10',
  serviceArea: 'Central California',
  crewSize: '2-4',
  licenseStatus: 'active',
  insuranceStatus: 'fully-insured',
  availability: 'within-30-days',
  message: 'Synthetic validation record for controlled testing only.',
  website: '',
  consent: true,
  submissionId: 'synthetic-test-2026-0001',
  source: 'masterscapes-careers',
  sourcePage: '/careers.html',
}

async function main() {
  delete process.env.MASTER_SCAPES_SUBCONTRACTOR_DELIVERY_ENABLED
  let result = await run({ method: 'POST', headers: {}, body: validBody })
  assert.equal(result.statusCode, 503)
  assert.equal(result.body.code, 'subcontractor_delivery_not_active')

  process.env.MASTER_SCAPES_SUBCONTRACTOR_DELIVERY_ENABLED = 'true'
  process.env.MASTER_SCAPES_FORM_ALLOWED_ORIGINS = 'https://www.masterscapes.pro'
  process.env.MASTER_SCAPES_SUBCONTRACTOR_WEBHOOK_URL = 'http://receiver.example.invalid/intake'
  process.env.MASTER_SCAPES_FORM_WEBHOOK_SECRET = '0123456789abcdef0123456789abcdef'
  result = await run({ method: 'POST', headers: { origin: 'https://www.masterscapes.pro', 'content-type': 'application/json' }, body: validBody })
  assert.equal(result.statusCode, 503)
  assert.equal(result.body.code, 'subcontractor_delivery_not_configured')

  process.env.MASTER_SCAPES_SUBCONTRACTOR_WEBHOOK_URL = 'https://receiver.example.invalid/intake'
  result = await run({ method: 'POST', headers: { origin: 'https://wrong.example', 'content-type': 'application/json' }, body: validBody })
  assert.equal(result.statusCode, 403)

  result = await run({ method: 'POST', headers: { origin: 'https://www.masterscapes.pro', 'content-type': 'application/json' }, body: { ...validBody, consent: false } })
  assert.equal(result.statusCode, 422)

  result = await run({ method: 'POST', headers: { origin: 'https://www.masterscapes.pro', 'content-type': 'application/json' }, body: { ...validBody, unexpected: 'blocked' } })
  assert.equal(result.statusCode, 422)

  result = await run({ method: 'POST', headers: { origin: 'https://www.masterscapes.pro', 'content-type': 'application/json' }, body: { ...validBody, website: 'bot.example' } })
  assert.equal(result.statusCode, 202)
  assert.equal(result.body.accepted, true)

  const originalFetch = global.fetch
  let captured
  global.fetch = async (url, options) => {
    captured = { url: String(url), options }
    return { ok: true, status: 202 }
  }
  result = await run({ method: 'POST', headers: { origin: 'https://www.masterscapes.pro', 'content-type': 'application/json' }, body: validBody })
  assert.equal(result.statusCode, 202)
  assert.equal(result.body.accepted, true)
  assert.equal(captured.url, 'https://receiver.example.invalid/intake')
  assert.equal(captured.options.redirect, 'manual')
  assert.match(captured.options.headers['x-solynx-signature'], /^sha256=[a-f0-9]{64}$/)
  assert.equal(captured.options.headers['x-solynx-submission-id'], validBody.submissionId)
  assert.equal(JSON.parse(captured.options.body).schema, 'solynx.master-scapes.subcontractor-interest.v1')

  global.fetch = async () => ({ ok: false, status: 302 })
  result = await run({ method: 'POST', headers: { origin: 'https://www.masterscapes.pro', 'content-type': 'application/json' }, body: validBody })
  assert.equal(result.statusCode, 502)
  assert.equal(result.body.code, 'delivery_rejected')

  global.fetch = async () => { throw new Error('synthetic failure') }
  result = await run({ method: 'POST', headers: { origin: 'https://www.masterscapes.pro', 'content-type': 'application/json' }, body: validBody })
  assert.equal(result.statusCode, 502)
  assert.equal(result.body.code, 'delivery_unavailable')
  global.fetch = originalFetch

  console.log('10 subcontractor intake controls passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
