import { DB } from './data.js';
import { Auth } from './auth.js';

const CLOUDINARY_CLOUD = 'diw92tmar';
const CLOUDINARY_PRESET = 'psjvaata';

const user = await Auth.init();
const params = new URLSearchParams(window.location.search);
const editId = params.get('edit');
let existingPet = null;

if (editId) {
  existingPet = await DB.getPetById(editId);
  if (existingPet) {
    if (!user || existingPet.ownerId !== user.id) {
      alert('You can only edit your own listings.');
      window.location.href = 'index.html';
    } else {
      prefillForm(existingPet);
      document.querySelector('.form-title').textContent = 'Edit Pet Listing';
      document.querySelector('button[type="submit"]').textContent = 'Save Changes';
    }
  }
}

const KNOWN_TYPES = ['dog', 'cat', 'bird', 'rabbit', 'fish', 'reptile', 'hamster'];

// Show/hide "Other" type input
document.getElementById('type').addEventListener('change', function() {
  document.getElementById('typeOther').style.display = this.value === 'other' ? '' : 'none';
});

// Show/hide "Other" gender input
document.getElementById('gender').addEventListener('change', function() {
  document.getElementById('genderOther').style.display = this.value === 'Other' ? '' : 'none';
});

function prefillForm(pet) {
  const set = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.value = v; };
  set('name', pet.name); set('breed', pet.breed);
  // Type: if stored value isn't a known type, select "other" and show custom input
  if (!pet.type || KNOWN_TYPES.includes(pet.type)) {
    set('type', pet.type);
  } else {
    document.getElementById('type').value = 'other';
    document.getElementById('typeOther').value = pet.type;
    document.getElementById('typeOther').style.display = '';
  }
  set('age', pet.age); set('location', pet.location);
  // Gender: if stored value isn't Male/Female, select "Other" and show custom input
  if (pet.gender === 'Male' || pet.gender === 'Female' || !pet.gender) {
    set('gender', pet.gender);
  } else {
    document.getElementById('gender').value = 'Other';
    document.getElementById('genderOther').value = pet.gender;
    document.getElementById('genderOther').style.display = '';
  }
  set('price', pet.price);
  document.getElementById('listingType').value = pet.listingType || 'adopt';
  const radioEl = document.querySelector(`input[name="listingTypeR"][value="${pet.listingType || 'adopt'}"]`);
  if (radioEl) radioEl.checked = true;
  document.getElementById('priceWrap').style.display = pet.listingType === 'sell' ? '' : 'none';
  (pet.health || []).forEach(trait => {
    const cb = document.querySelector(`input[name="health"][value="${trait}"]`);
    if (cb) cb.checked = true;
  });
  if (pet.image) {
    const preview = document.getElementById('imagePreview');
    if (preview) { preview.src = pet.image; preview.style.display = ''; }
    const currentImg = document.getElementById('currentImageWrap');
    if (currentImg) currentImg.style.display = '';
  }
}

// ── Image tabs ─────────────────────────────────────────────────
const tabFile  = document.getElementById('tabFile');
const tabUrl   = document.getElementById('tabUrl');
const filePane = document.getElementById('filePane');
const urlPane  = document.getElementById('urlPane');

tabFile.addEventListener('click', () => {
  tabFile.classList.add('active'); tabUrl.classList.remove('active');
  filePane.style.display = ''; urlPane.style.display = 'none';
});
tabUrl.addEventListener('click', () => {
  tabUrl.classList.add('active'); tabFile.classList.remove('active');
  urlPane.style.display = ''; filePane.style.display = 'none';
});

// ── Elements ───────────────────────────────────────────────────
const fileInput    = document.getElementById('imageFile');
const urlInput     = document.getElementById('imageUrl');
const preview      = document.getElementById('imagePreview');
const uploadStatus = document.getElementById('uploadStatus');
const progressBar  = document.getElementById('uploadProgress');

let uploadedImageUrl = '';

// URL preview
urlInput.addEventListener('input', e => {
  const val = e.target.value.trim();
  preview.src = val; preview.style.display = val ? '' : 'none';
  uploadedImageUrl = val;
});

// File preview
fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showStatus('File too large — max 5MB.', 'error');
    fileInput.value = ''; return;
  }
  const reader = new FileReader();
  reader.onload = ev => { preview.src = ev.target.result; preview.style.display = ''; };
  reader.readAsDataURL(file);
  showStatus('Photo selected — will upload on save.', 'info');
});

function showStatus(msg, type) {
  uploadStatus.textContent = msg;
  uploadStatus.className = 'upload-status ' + type;
  uploadStatus.style.display = '';
}

// ── Cloudinary upload ──────────────────────────────────────────
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PRESET);

  progressBar.style.display = '';
  showStatus('Uploading photo…', 'info');

  // Use XHR for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable) {
        const pct = Math.round(e.loaded / e.total * 100);
        progressBar.value = pct;
        showStatus(`Uploading… ${pct}%`, 'info');
      }
    });

    xhr.addEventListener('load', () => {
      progressBar.style.display = 'none';
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText);
        const secureUrl = (res.secure_url || res.url || '').replace('http://', 'https://');
        console.log('Cloudinary URL saved:', secureUrl);
        uploadedImageUrl = secureUrl;
        showStatus('Photo uploaded! ✓', 'success');
        preview.src = secureUrl;
        preview.style.display = '';
        resolve(secureUrl);
      } else {
        showStatus('Upload failed. Please try again.', 'error');
        reject(new Error('Upload failed'));
      }
    });

    xhr.addEventListener('error', () => {
      progressBar.style.display = 'none';
      showStatus('Upload failed. Check your connection.', 'error');
      reject(new Error('Network error'));
    });

    xhr.send(formData);
  });
}

// ── Form submit ────────────────────────────────────────────────
document.getElementById('petForm').addEventListener('submit', async e => {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  let imageUrl = uploadedImageUrl;

  const file = fileInput.files[0];
  if (file) {
    try {
      imageUrl = await uploadToCloudinary(file);
    } catch {
      submitBtn.disabled = false;
      submitBtn.textContent = editId ? 'Save Changes' : 'Publish listing';
      return;
    }
  }

  if (!imageUrl && editId && existingPet) {
    imageUrl = existingPet.image || '';
  }

  if (!document.getElementById('name').value.trim() || !imageUrl) {
    alert('Please fill in pet name and add a photo.');
    submitBtn.disabled = false;
    submitBtn.textContent = editId ? 'Save Changes' : 'Publish listing';
    return;
  }

  const health = [...document.querySelectorAll('input[name="health"]:checked')].map(c => c.value);
  const petData = {
    name:        document.getElementById('name').value.trim(),
    type:        document.getElementById('type').value === 'other'
                   ? (document.getElementById('typeOther').value.trim() || 'other')
                   : document.getElementById('type').value,
    breed:       document.getElementById('breed').value.trim(),
    age:         document.getElementById('age').value.trim(),
    location:    document.getElementById('location').value.trim(),
    gender:      document.getElementById('gender').value === 'Other'
                   ? document.getElementById('genderOther').value.trim()
                   : document.getElementById('gender').value,
    image:       imageUrl.replace('http://', 'https://'),
    vaccinated:  health.includes('Vaccinated'),
    listingType: document.getElementById('listingType').value,
    price:       document.getElementById('price')?.value.trim() || '',
    health,
    ownerId:     user ? user.id : '',
    ownerName:   user ? user.name : 'Guest'
  };

  try {
    if (editId && existingPet) {
      await DB.updatePet(editId, petData);
    } else {
      await DB.addPet(petData);
    }
    window.location.href = 'index.html';
  } catch (err) {
    alert('Error saving pet. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = editId ? 'Save Changes' : 'Publish listing';
  }
});

// Sync radio buttons
document.querySelectorAll('input[name="listingTypeR"]').forEach(r => {
  r.addEventListener('change', () => {
    document.getElementById('listingType').value = r.value;
    document.getElementById('priceWrap').style.display = r.value === 'sell' ? '' : 'none';
  });
});
