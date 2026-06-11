const APP_PIN = process.env.ALPHA_RECEIPTS_PIN || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
const GEMINI_MODEL = process.env.RECEIPT_AI_MODEL || 'gemini-2.5-flash';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function getPin(req) {
  const auth = req.headers.authorization || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return req.headers['x-alpha-pin'] || '';
}

function requirePin(req, res) {
  if (!APP_PIN) return true;
  if (getPin(req) === APP_PIN) return true;
  json(res, 401, { error: 'Access code required' });
  return false;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 6_500_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); }
      catch (_) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function parseImageDataUrl(value) {
  const match = String(value || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error('Receipt photo must be a base64 image data URL');
  return { mimeType: match[1], data: match[2] };
}

function extractJson(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('AI returned an empty receipt read');
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
  return JSON.parse(candidate || raw);
}

function normalizeReceipt(parsed) {
  const categories = ['Gas', 'Materials', 'Tools', 'Food', 'Vehicle', 'Office', 'Other'];
  const reimbursementTypes = ['Reimbursable', 'Company Card', 'Personal/Non-Reimbursable'];
  const amount = Number(parsed.amount || parsed.total || 0);
  const category = categories.includes(parsed.category) ? parsed.category : 'Other';
  const reimbursement_type = reimbursementTypes.includes(parsed.reimbursement_type) ? parsed.reimbursement_type : 'Reimbursable';
  const receipt_date = /^\d{4}-\d{2}-\d{2}$/.test(String(parsed.receipt_date || ''))
    ? parsed.receipt_date
    : new Date().toISOString().slice(0, 10);
  return {
    vendor: String(parsed.vendor || parsed.merchant || '').trim(),
    amount: Number.isFinite(amount) && amount >= 0 ? Number(amount.toFixed(2)) : 0,
    receipt_date,
    category,
    reimbursement_type,
    notes: String(parsed.notes || '').trim(),
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence || 0))),
    raw_ai: parsed,
  };
}

async function analyzeWithGemini({ mimeType, data }) {
  if (!GEMINI_API_KEY) throw new Error('Receipt AI is not configured');
  const prompt = `Read this construction/business reimbursement receipt image and return ONLY strict JSON.

Schema:
{
  "vendor": "store/vendor name",
  "amount": 0.00,
  "receipt_date": "YYYY-MM-DD",
  "category": "Gas|Materials|Tools|Food|Vehicle|Office|Other",
  "reimbursement_type": "Reimbursable|Company Card|Personal/Non-Reimbursable",
  "notes": "short useful note, include uncertainty if needed",
  "confidence": 0.0
}

Rules:
- Use the final paid total / amount charged, not subtotal, not tax alone.
- Prefer Gas for fuel stations/fuel receipts.
- Prefer Materials for Lowe's/Home Depot/lumber/hardware job supplies.
- Prefer Vehicle for repairs, oil, tires, wash, parts.
- If unsure, category Other and confidence below 0.7.
- Do not invent data. If unreadable, leave vendor blank, amount 0, today's date is acceptable only when no date is visible, confidence low.`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data } },
        ],
      }],
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `Gemini receipt read failed (${response.status})`;
    throw new Error(message);
  }
  const text = payload?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n') || '';
  return normalizeReceipt(extractJson(text));
}

module.exports = async function handler(req, res) {
  if (!requirePin(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }
  try {
    const body = await readBody(req);
    const image = parseImageDataUrl(body.image_data_url);
    const receipt = await analyzeWithGemini(image);
    return json(res, 200, { receipt, model: GEMINI_MODEL });
  } catch (error) {
    return json(res, error.message === 'Payload too large' ? 413 : 400, { error: error.message || 'Receipt AI failed' });
  }
};

module.exports.normalizeReceipt = normalizeReceipt;
module.exports.extractJson = extractJson;
