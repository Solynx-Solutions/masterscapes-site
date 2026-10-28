const { createHmac } = require('node:crypto')
const { isIP } = require('node:net')

const MAX_BODY_BYTES = 24_576
const ALLOWED_FIELDS = new Set([
  'projectType', 'materials', 'squareFootage', 'budget', 'timeline',
  'contact', 'consent', 'submissionId', 'source', 'sourcePage', 'website',
])
const CONTACT_FIELDS = new Set(['fullName', 'phone', 'email', 'location', 'followup'])
const CONSENT_FIELDS = new Set(['contact', 'sms', 'version'])
const OPTIONS = {
  projectType: new Set(['Luxury Patio', 'High-End Driveway', 'Resort Pool Deck', 'Outdoor Kitchen', 'Retaining Wall', 'Full Landscape Design', 'Multi-Area Estate Project']),
  materials: new Set(['Premium Pavers', 'Travertine', 'Natural Stone', 'Outdoor Porcelain', 'Luxury Turf', 'DG / Gravel', 'Mixed Hardscape + Softscape']),
  squareFootage: new Set(['Under 300 sq ft', '300-600 sq ft', '600-1,000 sq ft', '1,000-1,500 sq ft', '1,500-2,000 sq ft', '2,000-3,000 sq ft', '3,000+ sq ft']),
  budget: new Set(['$50,000 - $75,000', '$75,000 - $120,000', '$120,000 - $200,000', '$200,000 - $300,000', '$300,000+']),
  timeline: new Set(['ASAP', 'Within 30 Days', '1-3 Months', 'Just Planning']),
  followup: new Set(['Phone', 'Email', 'Text message']),
}

function json(res, status, body) {
  res.status(status)
  res.setHeader('cache-control', 'no-store')
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.json(body)
}

function cleanText(value, maxLength, optional = false) {
  if (optional && (value === undefined || value === null || value === '')) return ''
  if (typeof value !== 'string') return null
  const cleaned = value.trim().replace(/\s+/g, ' ')
  if ((!cleaned && !optional) || cleaned.length > maxLength) return null
  return cleaned
}

function hasOnlyFields(input, fields) {
  return input && typeof input === 'object' && !Array.isArray(input) && Object.keys(input).every(key => fields.has(key))
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
  if (!hasOnlyFields(input, ALLOWED_FIELDS)) return null
  if (input.website) return { bot: true }
  if (!hasOnlyFields(input.contact, CONTACT_FIELDS) || !hasOnlyFields(input.consent, CONSENT_FIELDS)) return null

  const materials = Array.isArray(input.materials) ? [...new Set(input.materials)] : null
  if (!materials || materials.length === 0 || materials.length > OPTIONS.materials.size || materials.some(value => !OPTIONS.materials.has(value))) return null

  const contact = {
    fullName: cleanText(input.contact.fullName, 120),
    phone: cleanText(input.contact.phone, 40),
    email: cleanText(input.contact.email, 254),
    location: cleanText(input.contact.location, 180, true),
    followup: cleanText(input.contact.followup, 20),
  }
  const payload = {
    projectType: cleanText(input.projectType, 60),
    materials,
    squareFootage: cleanText(input.squareFootage, 40),
    budget: cleanText(input.budget, 40),
    timeline: cleanText(input.timeline, 30),
    contact,
    consent: {
      contact: input.consent.contact === true,
      sms: input.consent.sms === true,
      version: cleanText(input.consent.version, 40),
    },
    submissionId: cleanText(input.submissionId, 80),
    source: cleanText(input.source, 80),
    sourcePage: cleanText(input.sourcePage, 200),
  }

  if (!payload.projectType || !payload.squareFootage || !payload.budget || !payload.timeline || !payload.submissionId || !payload.source || !payload.sourcePage) return null
  if (Object.values(contact).some(value => value === null)) return null
  if (!payload.consent.version || !payload.consent.contact) return null
  if (contact.followup === 'Text message' && !payload.consent.sms) return null
  if (!OPTIONS.projectType.has(payload.projectType) || !OPTIONS.squareFootage.has(payload.squareFootage) || !OPTIONS.budget.has(payload.budget) || !OPTIONS.timeline.has(payload.timeline) || !OPTIONS.followup.has(contact.followup)) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) return null
  if (!/^\+?[0-9().\-\s]{7,40}$/.test(contact.phone)) return null
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(payload.submissionId)) return null
  if (!payload.sourcePage.startsWith('/') || payload.sourcePage.startsWith('//')) return null

  contact.email = contact.email.toLowerCase()
  return payload
}

function configuredRouting() {
  const locationId = cleanText(process.env.MASTER_SCAPES_PLATFORM_LOCATION_ID, 80)
  const assigneeUserId = cleanText(process.env.MASTER_SCAPES_PLANNER_ASSIGNEE_USER_ID, 80)
  if (!locationId || !assigneeUserId || !/^[a-zA-Z0-9_-]{10,80}$/.test(locationId) || !/^[a-zA-Z0-9_-]{10,80}$/.test(assigneeUserId)) return null
  return { locationId, assigneeUserId }
}

function parseReceipt(upstreamBody) {
  if (!upstreamBody || typeof upstreamBody !== 'object' || Array.isArray(upstreamBody)) return null
  if (upstreamBody.accepted !== true) return null
  const receiptId = cleanText(upstreamBody.receiptId, 100)
  if (!receiptId || !/^[a-zA-Z0-9_-]{8,100}$/.test(receiptId)) return null
  return { receiptId, duplicate: upstreamBody.duplicate === true }
}

module.exports = async function projectPlannerSubmit(req, res) {
  if (req.method !== 'POST') return json(res, 405, { accepted: false, code: 'method_not_allowed' })
  if (process.env.MASTER_SCAPES_PLANNER_DELIVERY_ENABLED !== 'true') {
    return json(res, 503, { accepted: false, code: 'planner_delivery_not_active' })
  }

  const webhookUrl = process.env.MASTER_SCAPES_PLANNER_WEBHOOK_URL
  const webhookSecret = process.env.MASTER_SCAPES_FORM_WEBHOOK_SECRET
  const origins = allowedOrigins()
  const routing = configuredRouting()
  if (!webhookUrl || !isSafeWebhookUrl(webhookUrl) || !webhookSecret || webhookSecret.length < 32 || origins.size === 0 || !routing) {
    return json(res, 503, { accepted: false, code: 'planner_delivery_not_configured' })
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
    schema: 'solynx.master-scapes.project-planner.v1',
    submittedAt: new Date().toISOString(),
    submission: payload,
    routing,
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
    console.error('project_planner_delivery_unavailable', { submissionId: payload.submissionId })
    return json(res, 502, { accepted: false, code: 'delivery_unavailable' })
  }

  if (!upstream.ok) {
    console.error('project_planner_delivery_rejected', { submissionId: payload.submissionId, status: upstream.status })
    return json(res, 502, { accepted: false, code: 'delivery_rejected' })
  }

  let receipt
  try {
    receipt = parseReceipt(await upstream.json())
  } catch {
    receipt = null
  }
  if (!receipt) {
    console.error('project_planner_delivery_unconfirmed', { submissionId: payload.submissionId })
    return json(res, 502, { accepted: false, code: 'delivery_unconfirmed' })
  }

  return json(res, 202, { accepted: true, receiptId: receipt.receiptId, duplicate: receipt.duplicate })
}

module.exports._test = { parsePayload, parseReceipt, isSafeWebhookUrl }
