const { createHmac } = require('node:crypto')
const { isIP } = require('node:net')

const MAX_BODY_BYTES = 24_576
const ALLOWED_FIELDS = new Set([
  'name', 'businessName', 'phone', 'email', 'trade', 'experience',
  'serviceArea', 'crewSize', 'licenseStatus', 'insuranceStatus',
  'availability', 'message', 'website', 'consent', 'submissionId',
  'source', 'sourcePage',
])

const OPTIONS = {
  trade: new Set(['hardscape-pavers', 'outdoor-living', 'retaining-walls', 'landscape-construction', 'demo-grading', 'irrigation', 'lighting', 'pool-deck', 'concrete-stone', 'multiple', 'other']),
  experience: new Set(['1-2', '3-5', '6-10', '10-plus']),
  crewSize: new Set(['solo', '2-4', '5-9', '10-plus']),
  licenseStatus: new Set(['active', 'not-required', 'in-progress', 'none']),
  insuranceStatus: new Set(['fully-insured', 'general-liability', 'in-progress', 'none']),
  availability: new Set(['immediate', 'within-30-days', 'within-60-days', 'future']),
}

function json(res, status, body) {
  res.status(status)
  res.setHeader('cache-control', 'no-store')
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.json(body)
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return null
  const cleaned = value.trim().replace(/\s+/g, ' ')
  if (!cleaned || cleaned.length > maxLength) return null
  return cleaned
}

function allowedOrigins() {
  const result = new Set()
  for (const configured of (process.env.MASTER_SCAPES_FORM_ALLOWED_ORIGINS || '').split(',')) {
    const candidate = configured.trim()
    if (!candidate) continue
    try {
      const url = new URL(candidate)
      if (url.protocol === 'https:' && url.pathname === '/' && !url.search && !url.hash) result.add(url.origin)
    } catch {
      // Invalid configuration is ignored so delivery fails closed.
    }
  }
  return result
}

function isSafeWebhookUrl(raw) {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) return false
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (hostname === 'localhost' || hostname.endsWith('.local')) return false
    const version = isIP(hostname)
    if (!version) return true
    if (version === 4) {
      const [a, b] = hostname.split('.').map(Number)
      return !(a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168))
    }
    return hostname !== '::1' && !hostname.startsWith('fc') && !hostname.startsWith('fd') && !hostname.startsWith('fe80')
  } catch {
    return false
  }
}

function parsePayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  if (Object.keys(input).some((key) => !ALLOWED_FIELDS.has(key))) return null
  if (input.website) return { bot: true }

  const payload = {
    name: cleanText(input.name, 120),
    businessName: cleanText(input.businessName, 140),
    phone: cleanText(input.phone, 40),
    email: cleanText(input.email, 254),
    trade: cleanText(input.trade, 40),
    experience: cleanText(input.experience, 20),
    serviceArea: cleanText(input.serviceArea, 120),
    crewSize: cleanText(input.crewSize, 20),
    licenseStatus: cleanText(input.licenseStatus, 30),
    insuranceStatus: cleanText(input.insuranceStatus, 30),
    availability: cleanText(input.availability, 30),
    message: cleanText(input.message, 2_000),
    submissionId: cleanText(input.submissionId, 80),
    source: cleanText(input.source, 80),
    sourcePage: cleanText(input.sourcePage, 200),
  }

  if (Object.values(payload).some((value) => !value)) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return null
  if (!/^\+?[0-9().\-\s]{7,40}$/.test(payload.phone)) return null
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(payload.submissionId)) return null
  if (!payload.sourcePage.startsWith('/') || payload.sourcePage.startsWith('//')) return null
  if (input.consent !== true) return null
  for (const [field, options] of Object.entries(OPTIONS)) {
    if (!options.has(payload[field])) return null
  }

  payload.email = payload.email.toLowerCase()
  return payload
}

module.exports = async function subcontractorInterest(req, res) {
  if (req.method !== 'POST') return json(res, 405, { accepted: false, code: 'method_not_allowed' })
  if (process.env.MASTER_SCAPES_SUBCONTRACTOR_DELIVERY_ENABLED !== 'true') {
    return json(res, 503, { accepted: false, code: 'subcontractor_delivery_not_active' })
  }

  const webhookUrl = process.env.MASTER_SCAPES_SUBCONTRACTOR_WEBHOOK_URL
  const webhookSecret = process.env.MASTER_SCAPES_FORM_WEBHOOK_SECRET
  const origins = allowedOrigins()
  if (!webhookUrl || !isSafeWebhookUrl(webhookUrl) || !webhookSecret || webhookSecret.length < 32 || origins.size === 0) {
    return json(res, 503, { accepted: false, code: 'subcontractor_delivery_not_configured' })
  }

  const origin = req.headers.origin
  if (!origin || !origins.has(origin)) return json(res, 403, { accepted: false, code: 'origin_not_allowed' })
  const contentType = String(req.headers['content-type'] || '').toLowerCase()
  if (!contentType.startsWith('application/json')) return json(res, 415, { accepted: false, code: 'unsupported_media_type' })
  const declaredLength = Number(req.headers['content-length'] || '0')
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return json(res, 413, { accepted: false, code: 'payload_too_large' })

  const payload = parsePayload(req.body)
  if (payload?.bot) return json(res, 202, { accepted: true })
  if (!payload) return json(res, 422, { accepted: false, code: 'invalid_submission' })

  const forwardedBody = JSON.stringify({
    schema: 'solynx.master-scapes.subcontractor-interest.v1',
    submittedAt: new Date().toISOString(),
    submission: payload,
  })
  const signature = createHmac('sha256', webhookSecret).update(forwardedBody).digest('hex')

  let upstream
  try {
    upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-solynx-signature': `sha256=${signature}`,
        'x-solynx-submission-id': payload.submissionId,
      },
      body: forwardedBody,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000),
    })
  } catch {
    return json(res, 502, { accepted: false, code: 'delivery_unavailable' })
  }

  if (!upstream.ok) return json(res, 502, { accepted: false, code: 'delivery_rejected' })
  return json(res, 202, { accepted: true })
}
