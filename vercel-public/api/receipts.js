const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_PIN = process.env.ALPHA_RECEIPTS_PIN || '';
const TABLE = 'alpha_receipts';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function fail(res, status, message) {
  json(res, status, { error: message });
}

function requireConfig(res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    fail(res, 500, 'Supabase backend is not configured');
    return false;
  }
  return true;
}

function getPin(req) {
  const auth = req.headers.authorization || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return req.headers['x-alpha-pin'] || '';
}

function requirePin(req, res) {
  if (!APP_PIN) return true;
  if (getPin(req) === APP_PIN) return true;
  fail(res, 401, 'Access code required');
  return false;
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra,
  };
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

function cleanReceipt(input) {
  const purchaser = String(input.purchaser || '').trim();
  const vendor = String(input.vendor || '').trim();
  const amount = Number(input.amount);
  const category = String(input.category || 'Other').trim();
  const reimbursement_type = String(input.reimbursement_type || 'Reimbursable').trim();
  const notes = String(input.notes || '').trim();
  const receipt_date = String(input.receipt_date || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const image_data_url = input.image_data_url ? String(input.image_data_url) : null;
  if (!['Toby', 'Brian'].includes(purchaser)) throw new Error('Choose Toby or Brian');
  if (!vendor) throw new Error('Vendor is required');
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Amount must be valid');
  if (!['Reimbursable', 'Company Card', 'Personal/Non-Reimbursable'].includes(reimbursement_type)) throw new Error('Invalid reimbursement type');
  if (image_data_url && !image_data_url.startsWith('data:image/')) throw new Error('Receipt photo must be an image');
  return { purchaser, vendor, amount, category, reimbursement_type, notes, receipt_date, image_data_url };
}

function buildQuery(query = {}) {
  const params = new URLSearchParams({ select: '*', order: 'receipt_date.desc,created_at.desc' });
  if (query.purchaser && ['Toby', 'Brian'].includes(query.purchaser)) params.set('purchaser', `eq.${query.purchaser}`);
  if (query.start) params.set('receipt_date', `gte.${query.start}`);
  if (query.end) params.append('receipt_date', `lte.${query.end}`);
  if (query.reimbursement_type) params.set('reimbursement_type', `eq.${query.reimbursement_type}`);
  return params;
}

async function supabaseFetch(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, options);
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
  if (!response.ok) {
    const message = data?.message || data?.error || text || `Supabase ${response.status}`;
    throw new Error(message);
  }
  return data;
}

function totalsFor(rows) {
  const people = { Toby: 0, Brian: 0 };
  let reimbursable = 0;
  let all = 0;
  for (const row of rows) {
    const amount = Number(row.amount || 0);
    all += amount;
    if (row.reimbursement_type === 'Reimbursable') {
      reimbursable += amount;
      people[row.purchaser] = (people[row.purchaser] || 0) + amount;
    }
  }
  return { reimbursable, all, Toby: people.Toby || 0, Brian: people.Brian || 0 };
}

module.exports = async function handler(req, res) {
  if (!requireConfig(res) || !requirePin(req, res)) return;
  try {
    if (req.method === 'GET') {
      const params = buildQuery(req.query || {});
      const rows = await supabaseFetch(`${TABLE}?${params.toString()}`, {
        headers: supabaseHeaders(),
      });
      return json(res, 200, { receipts: rows, totals: totalsFor(rows) });
    }
    if (req.method === 'POST') {
      const body = await readBody(req);
      const receipt = cleanReceipt(body);
      const rows = await supabaseFetch(`${TABLE}?select=*`, {
        method: 'POST',
        headers: supabaseHeaders({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
        body: JSON.stringify(receipt),
      });
      return json(res, 201, { receipt: rows[0] });
    }
    if (req.method === 'DELETE') {
      const id = String((req.query || {}).id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return fail(res, 400, 'Valid receipt id required');
      await supabaseFetch(`${TABLE}?id=eq.${id}`, {
        method: 'DELETE',
        headers: supabaseHeaders(),
      });
      return json(res, 200, { ok: true });
    }
    res.setHeader('Allow', 'GET,POST,DELETE');
    return fail(res, 405, 'Method not allowed');
  } catch (error) {
    return fail(res, error.message === 'Payload too large' ? 413 : 400, error.message || 'Request failed');
  }
};

module.exports.totalsFor = totalsFor;
module.exports.cleanReceipt = cleanReceipt;
