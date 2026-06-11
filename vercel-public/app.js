const STORAGE_KEY = 'alpha_receipts_v2';
const form = document.querySelector('#receipt-form');
const list = document.querySelector('#receipt-list');
const countEl = document.querySelector('#receipt-count');
const totalEl = document.querySelector('#receipt-total');
const statusEl = document.querySelector('#sync-status');
const fileInput = document.querySelector('#receipt-image');
const preview = document.querySelector('#image-preview');
const exportBtn = document.querySelector('#export-csv');
const clearBtn = document.querySelector('#clear-all');
const installBtn = document.querySelector('#install-app');
let deferredInstallPrompt = null;
let imageData = '';

function money(value) {
  return `$${(Number(value) || 0).toFixed(2)}`;
}

function loadReceipts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (_) {
    return [];
  }
}

function saveReceipts(receipts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
}

function receiptToCsvValue(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function render() {
  const receipts = loadReceipts().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  countEl.textContent = receipts.length;
  totalEl.textContent = money(receipts.reduce((sum, item) => sum + Number(item.amount || 0), 0));
  if (!receipts.length) {
    list.innerHTML = '<p class="empty">No receipts yet. Take a photo and save the first one.</p>';
    return;
  }
  list.innerHTML = receipts.map(item => `
    <article class="receipt-card" data-id="${item.id}">
      ${item.image ? `<img src="${item.image}" alt="Receipt image for ${escapeHtml(item.vendor)}" />` : '<div class="no-photo">No photo</div>'}
      <div>
        <div class="row"><strong>${escapeHtml(item.vendor || 'Receipt')}</strong><span>${money(item.amount)}</span></div>
        <div class="meta">${escapeHtml(item.date || '')} · ${escapeHtml(item.category || 'Uncategorized')}</div>
        ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ''}
        <button class="delete" type="button" data-delete="${item.id}">Delete</button>
      </div>
    </article>
  `).join('');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not load image'));
      img.onload = () => {
        const max = 1400;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  statusEl.textContent = 'Preparing photo...';
  try {
    imageData = await resizeImage(file);
    preview.src = imageData;
    preview.hidden = false;
    statusEl.textContent = 'Photo ready. Add details and save.';
  } catch (error) {
    imageData = '';
    preview.hidden = true;
    statusEl.textContent = error.message || 'Photo failed.';
  }
});

form.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(form);
  const receipt = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    vendor: data.get('vendor'),
    amount: Number(data.get('amount') || 0),
    date: data.get('date') || new Date().toISOString().slice(0, 10),
    category: data.get('category'),
    notes: data.get('notes'),
    image: imageData,
    createdAt: new Date().toISOString()
  };
  const receipts = loadReceipts();
  receipts.push(receipt);
  saveReceipts(receipts);
  form.reset();
  imageData = '';
  preview.hidden = true;
  statusEl.textContent = 'Saved on this phone. No server required.';
  render();
});

list.addEventListener('click', event => {
  const id = event.target?.dataset?.delete;
  if (!id) return;
  const receipts = loadReceipts().filter(item => item.id !== id);
  saveReceipts(receipts);
  render();
});

exportBtn.addEventListener('click', () => {
  const receipts = loadReceipts();
  const header = ['date', 'vendor', 'amount', 'category', 'notes', 'createdAt'];
  const rows = receipts.map(item => header.map(key => receiptToCsvValue(item[key])).join(','));
  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `alpha-receipts-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

clearBtn.addEventListener('click', () => {
  if (!confirm('Delete all receipts saved on this phone?')) return;
  saveReceipts([]);
  render();
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
  navigator.serviceWorker.register('/sw.js').then(() => {
    statusEl.textContent = 'Ready offline. Add this page to your home screen.';
  }).catch(() => {
    statusEl.textContent = 'Ready in browser. Home-screen install may be limited.';
  });
}

document.querySelector('#receipt-date').value = new Date().toISOString().slice(0, 10);
render();
