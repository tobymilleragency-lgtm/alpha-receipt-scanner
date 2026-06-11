const receiptsHandler = require('./receipts.js');
const { totalsFor } = receiptsHandler;

function requirePin(req, res) {
  const expected = process.env.ALPHA_RECEIPTS_PIN || '';
  if (!expected) return true;
  const auth = req.headers.authorization || '';
  const pin = auth.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : (req.headers['x-alpha-pin'] || req.query?.download_token || '');
  if (pin === expected) return true;
  res.statusCode = 401;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('Access code required');
  return false;
}

function csvValue(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end('Method not allowed');
    return;
  }
  if (!requirePin(req, res)) return;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.statusCode = 500;
    res.end('Supabase backend is not configured');
    return;
  }

  const params = new URLSearchParams({ select: 'purchaser,receipt_date,vendor,amount,category,reimbursement_type,notes,created_at', order: 'receipt_date.desc,created_at.desc' });
  if (req.query?.purchaser && ['Toby', 'Brian'].includes(req.query.purchaser)) params.set('purchaser', `eq.${req.query.purchaser}`);
  if (req.query?.start) params.set('receipt_date', `gte.${req.query.start}`);
  if (req.query?.end) params.append('receipt_date', `lte.${req.query.end}`);
  if (req.query?.reimbursement_type) params.set('reimbursement_type', `eq.${req.query.reimbursement_type}`);

  const response = await fetch(`${SUPABASE_URL}/rest/v1/alpha_receipts?${params.toString()}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  const rows = await response.json();
  if (!response.ok) {
    res.statusCode = response.status;
    res.end(rows?.message || 'Export failed');
    return;
  }

  const totals = totalsFor(rows);
  const header = ['purchaser', 'receipt_date', 'vendor', 'amount', 'category', 'reimbursement_type', 'notes', 'created_at'];
  const lines = [
    ['Alpha Receipt Export'].map(csvValue).join(','),
    ['Reimbursable Toby', totals.Toby.toFixed(2)].map(csvValue).join(','),
    ['Reimbursable Brian', totals.Brian.toFixed(2)].map(csvValue).join(','),
    ['Reimbursable Combined', totals.reimbursable.toFixed(2)].map(csvValue).join(','),
    [],
    header.join(','),
    ...rows.map(row => header.map(key => csvValue(row[key])).join(',')),
  ];

  const suffix = new Date().toISOString().slice(0, 10);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="alpha-receipts-${suffix}.csv"`);
  res.setHeader('Cache-Control', 'no-store');
  res.end(lines.join('\n'));
};
