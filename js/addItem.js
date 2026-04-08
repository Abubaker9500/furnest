import { DB } from './data.js';
import { Auth } from './auth.js';

const CLOUDINARY_CLOUD = 'diw92tmar';
const CLOUDINARY_PRESET = 'psjvaata';

const user = await Auth.init();
if (!user) { window.location.href = 'login.html'; }

const params = new URLSearchParams(window.location.search);
const editId = params.get('edit');
let existingItem = null;

if (editId) {
  existingItem = await DB.getItemById(editId);
  if (existingItem) {
    if (existingItem.ownerId !== user.id) {
      alert('You can only edit your own listings.');
      window.location.href = 'marketplace.html';
    } else {
      prefillForm(existingItem);
      document.querySelector('.form-title').textContent = 'Edit Item Listing';
      document.getElementById('submitBtn').textContent = 'Save Changes';
    }
  }
}

function prefillForm(item) {
  const set = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.value = v; };
  set('title', item.title);
  set('category', item.category);
  set('condition', item.condition);
  set('description', item.description);
  set('location', item.location);
  set('price', item.price);
  set('listingType', item.listingType);
  const radio = document.querySelector(`input[name="listingTypeR"][value="${item.listingType}"]`);
  if (radio) radio.checked = true;
  document.getElementById('priceWrap').style.display = item.listingType === 'free' ? 'none' : '';
  if (item.image) {
    imageUrl = item.image;
    document.getElementById('imagePreview').src = item.image;
    document.getElementById('imagePreviewWrap').style.display = '';
  }
}

// ── Listing type toggle ───────────────────────────────────────────────────────
document.querySelectorAll('input[name="listingTypeR"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const val = radio.value;
    document.getElementById('listingType').value = val;
    document.getElementById('priceWrap').style.display = val === 'free' ? 'none' : '';
  });
});

// ── Image upload ──────────────────────────────────────────────────────────────
let imageUrl = existingItem?.image || '';

function uploadToCloudinary(file, onProgress) {
  return new Promise((resolve, reject) => {
    const MAX_MB = 5;
    if (file.size > MAX_MB * 1024 * 1024) { reject(new Error(`File exceeds ${MAX_MB}MB`)); return; }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', CLOUDINARY_PRESET);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`);
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)); };
    xhr.onload = () => {
      const res = JSON.parse(xhr.responseText);
      res.secure_url ? resolve(res.secure_url) : reject(new Error(res.error?.message || 'Upload failed'));
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(fd);
  });
}

document.getElementById('imageFile').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  const status = document.getElementById('uploadStatus');
  status.textContent = 'Uploading…'; status.className = 'upload-status info'; status.style.display = '';
  try {
    imageUrl = await uploadToCloudinary(file, pct => { status.textContent = `Uploading… ${pct}%`; });
    document.getElementById('imagePreview').src = imageUrl;
    document.getElementById('imagePreviewWrap').style.display = '';
    status.style.display = 'none';
  } catch(err) {
    status.textContent = err.message || 'Upload failed.';
    status.className = 'upload-status error';
  }
});

document.getElementById('removeImage').addEventListener('click', () => {
  imageUrl = '';
  document.getElementById('imagePreview').src = '';
  document.getElementById('imagePreviewWrap').style.display = 'none';
  document.getElementById('imageFile').value = '';
});

// ── Form submit ───────────────────────────────────────────────────────────────
document.getElementById('itemForm').addEventListener('submit', async e => {
  e.preventDefault();
  const title = document.getElementById('title').value.trim();
  if (!title) { alert('Please enter a title.'); return; }

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = editId ? 'Saving…' : 'Publishing…';

  const listingType = document.getElementById('listingType').value;
  const itemData = {
    title,
    category:    document.getElementById('category').value,
    condition:   document.getElementById('condition').value,
    description: document.getElementById('description').value.trim(),
    location:    document.getElementById('location').value.trim(),
    listingType,
    price:       listingType === 'free' ? '' : (document.getElementById('price').value.trim() || ''),
    image:       imageUrl.replace('http://', 'https://'),
    ownerId:     user.id,
    ownerName:   user.name,
  };

  try {
    if (editId && existingItem) {
      await DB.updateItem(editId, itemData);
    } else {
      await DB.addItem(itemData);
    }
    window.location.href = 'marketplace.html?tab=items';
  } catch(err) {
    console.error('Save failed:', err);
    alert('Could not save listing. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = editId ? 'Save Changes' : 'Publish listing';
  }
});
