const ACCESS_KEY = 'alpha_receipts_access_code';
const state = {
  receipts: [],
  totals: { reimbursable: 0, all: 0, Toby: 0, Brian: 0 },
  imageDataUrl: '',
  loading: false,
};

const $ = selector => document.querySelector(selector);
const form = $('#receipt-form');
const list = $('#receipt-list');
const countEl = $('#receipt-count');
const allTotalEl = $('#all-total');
const tobyTotalEl = $('#toby-total');
const brianTotalEl = $('#brian-total');
const reimbursableTotalEl = $('#reimbursable-total');
const statusEl = $('#sync-status');
const fileInput = $('#receipt-image');
const preview = $('#image-preview');
const exportBtn = $('#export-csv');
const refreshBtn = $('#refresh-data');
const installBtn = $('#install-app');
const accessForm = $('#access-form');
const appShell = $('#app-shell');
const accessInput = $('#access-code');
let deferredInstallPrompt = null;

function money(value) {
  return `$${(Number(value) || 0).toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getAccessCode() {
  return localStorage.getItem(ACCESS_KEY) || '';
}

function setAccessCode(code) {
  localStorage.setItem(ACCESS_KEY, code.trim());
}

function authHeaders() {
  return { Authorization: `Bearer ${getAccessCode()}` };
}

function queryFromFilters() {
  const params = new URLSearchParams();
  const purchaser = $('#filter-purchaser').value;
  const start = $('#filter-start').value;
  const end = $('#filter-end').value;
  const type = $('#filter-type').value;
  if (purchaser) params.set('purchaser', purchaser);
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  if (type) params.set('reimbursement_type', type);
  return params;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
  if (!response.ok) {
    const message = data?.error || data?.message || text || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

function render() {
  const receipts = state.receipts;
  countEl.textContent = receipts.length;
  allTotalEl.textContent = money(state.totals.all);
  reimbursableTotalEl.textContent = money(state.totals.reimbursable);
  tobyTotalEl.textContent = money(state.totals.Toby);
  brianTotalEl.textContent = money(state.totals.Brian);
  if (!receipts.length) {
    list.innerHTML = '<p class="empty">No receipts in this filter yet.</p>';
    return;
  }
  list.innerHTML = receipts.map(item => `
    <article class="receipt-card" data-id="${item.id}">
      ${item.image_data_url ? `<img src="${item.image_data_url}" alt="Receipt image for ${escapeHtml(item.vendor)}" loading="lazy" />` : '<div class="no-photo">No photo</div>'}
      <div>
        <div class="row"><strong>${escapeHtml(item.vendor || 'Receipt')}</strong><span>${money(item.amount)}</span></div>
        <div class="meta">${escapeHtml(item.purchaser)} · ${escapeHtml(item.receipt_date || '')} · ${escapeHtml(item.category || 'Other')}</div>
        <div class="pill ${item.reimbursement_type === 'Reimbursable' ? 'good' : ''}">${escapeHtml(item.reimbursement_type)}</div>
        ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ''}
        <button class="delete" type="button" data-delete="${item.id}">Delete</button>
      </div>
    </article>
  `).join('');
}

function setStatus(message, ok = true) {
  statusEl.textContent = message;
  statusEl.classList.toggle('bad', !ok);
}

async function loadReceipts() {
  if (!getAccessCode()) {
    appShell.hidden = true;
    accessForm.hidden = false;
    return;
  }
  appShell.hidden = false;
  accessForm.hidden = true;
  setStatus('Loading Supabase receipts...');
  try {
    const params = queryFromFilters();
    const data = await api(`/api/receipts?${params.toString()}`);
    state.receipts = data.receipts || [];
    state.totals = data.totals || state.totals;
    render();
    setStatus('Synced to Supabase. Toby and Brian can both use this.');
  } catch (error) {
    if (/access code/i.test(error.message)) {
      localStorage.removeItem(ACCESS_KEY);
      appShell.hidden = true;
      accessForm.hidden = false;
    }
    setStatus(error.message || 'Could not load receipts.', false);
  }
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not load image'));
      img.onload = () => {
        const max = 1200;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  setStatus('Preparing photo...');
  try {
    state.imageDataUrl = await resizeImage(file);
    preview.src = state.imageDataUrl;
    preview.hidden = false;
    setStatus('Photo ready. Saving will upload it to Supabase.');
  } catch (error) {
    state.imageDataUrl = '';
    preview.hidden = true;
    setStatus(error.message || 'Photo failed.', false);
  }
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (state.loading) return;
  state.loading = true;
  form.querySelector('button[type="submit"]').disabled = true;
  setStatus('Saving receipt to Supabase...');
  try {
    const data = new FormData(form);
    const receipt = {
      purchaser: data.get('purchaser'),
      vendor: data.get('vendor'),
      amount: data.get('amount'),
      receipt_date: data.get('receipt_date'),
      category: data.get('category'),
      reimbursement_type: data.get('reimbursement_type'),
      notes: data.get('notes'),
      image_data_url: state.imageDataUrl,
    };
    await api('/api/receipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(receipt),
    });
    form.reset();
    $('#receipt-date').value = new Date().toISOString().slice(0, 10);
    state.imageDataUrl = '';
    preview.hidden = true;
    setStatus('Saved to Supabase. Ready for reimbursement export.');
    await loadReceipts();
  } catch (error) {
    setStatus(error.message || 'Save failed.', false);
  } finally {
    state.loading = false;
    form.querySelector('button[type="submit"]').disabled = false;
  }
});

list.addEventListener('click', async event => {
  const id = event.target?.dataset?.delete;
  if (!id) return;
  if (!confirm('Delete this receipt from Supabase?')) return;
  setStatus('Deleting receipt...');
  try {
    await api(`/api/receipts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    await loadReceipts();
  } catch (error) {
    setStatus(error.message || 'Delete failed.', false);
  }
});

exportBtn.addEventListener('click', () => {
  const params = queryFromFilters();
  const token = encodeURIComponent(getAccessCode());
  window.location.href = `/api/export?${params.toString()}&download_token=${token}`;
});

refreshBtn.addEventListener('click', () => void loadReceipts());
['#filter-purchaser', '#filter-start', '#filter-end', '#filter-type'].forEach(selector => {
  $(selector).addEventListener('change', () => void loadReceipts());
});

accessForm.addEventListener('submit', event => {
  event.preventDefault();
  setAccessCode(accessInput.value);
  accessInput.value = '';
  void loadReceipts();
});

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installBtn.hidden = false;
});
installBtn.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice.catch(() => null);
  deferredInstallPrompt = null;
  installBtn.hidden = true;
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

$('#receipt-date').value = new Date().toISOString().slice(0, 10);
const today = new Date();
const first = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
$('#filter-start').value = first;
$('#filter-end').value = today.toISOString().slice(0, 10);
void loadReceipts();
