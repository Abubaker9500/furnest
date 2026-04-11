import { DB } from './data.js';
import { Auth } from './auth.js';
import { MsgDB } from './messaging.js';
import { showConfirm } from './confirm.js';

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

const user = await Auth.init();
if (!user) { window.location.href = 'login.html'; }

const params = new URLSearchParams(window.location.search);
const petId = params.get('id');

if (!petId) { window.location.href = 'index.html'; }

const pet = await DB.getPetById(petId);
if (!pet) {
  document.getElementById('detailsRoot').innerHTML = '<p class="text-center py-5">Pet not found. <a href="marketplace.html">Go back</a></p>';
} else {
  const isOwner = user && user.id === pet.ownerId;
  const owner = pet.ownerId ? await DB.getUserById(pet.ownerId) : null;

  document.title = `${escapeHtml(pet.name)} — Fur Nest`;

  const badgeMap = {
    adopt: `<span class="detail-badge badge-adopt">For Adoption</span>`,
    sell:  `<span class="detail-badge badge-sell">${pet.price ? '$' + escapeHtml(pet.price) : 'For Sale'}</span>`,
    free:  `<span class="detail-badge badge-free">Free to Good Home</span>`
  };
  const statusMap = {
    sold:      `<span class="detail-status status-sold">Sold</span>`,
    adopted:   `<span class="detail-status status-adopted">Adopted</span>`,
    available: ''
  };

  const healthTags = pet.health || (pet.vaccinated ? ['Vaccinated'] : []);
  const petTypeDisplay = pet.type ? escapeHtml(pet.type.charAt(0).toUpperCase() + pet.type.slice(1)) : '';
  const petStatusDisplay = pet.status ? escapeHtml(pet.status.charAt(0).toUpperCase() + pet.status.slice(1)) : 'Available';

  document.getElementById('detailsRoot').innerHTML = `
    <div class="detail-hero">
      <img src="${escapeHtml(pet.image || 'https://placehold.co/800x500?text=No+Photo')}" alt="${escapeHtml(pet.name)}" class="detail-img">
      <div class="detail-overlay">
        <div class="detail-badges">
          ${badgeMap[pet.listingType] || ''}
          ${statusMap[pet.status] || ''}
        </div>
      </div>
    </div>
    <div class="detail-body">
      <div class="detail-main">
        <div class="detail-header">
          <div>
            <h1 class="detail-name">${escapeHtml(pet.name)}</h1>
            <p class="detail-breed">${escapeHtml(pet.breed || '')} ${petTypeDisplay ? '· ' + petTypeDisplay : ''}</p>
          </div>
          ${isOwner ? `
          <div class="owner-actions">
            <a href="add-pet.html?edit=${pet.id}" class="btn-edit">Edit</a>
            <button class="btn-delete" id="deleteBtn">Delete</button>
          </div>` : ''}
        </div>
        <div class="detail-stats">
          <div class="stat-box"><span class="stat-label">Age</span><span class="stat-value">${escapeHtml(pet.age) || '—'}</span></div>
          <div class="stat-box"><span class="stat-label">Gender</span><span class="stat-value">${escapeHtml(pet.gender) || '—'}</span></div>
          <div class="stat-box"><span class="stat-label">Location</span><span class="stat-value">${escapeHtml(pet.location) || '—'}</span></div>
          <div class="stat-box"><span class="stat-label">Status</span><span class="stat-value">${petStatusDisplay}</span></div>
        </div>
        ${healthTags.length ? `
        <div class="detail-section">
          <h3>Health &amp; traits</h3>
          <div class="health-tags">${healthTags.map(t => `<span class="health-tag">${escapeHtml(t)}</span>`).join('')}</div>
        </div>` : ''}
        ${isOwner && pet.status === 'available' ? `
        <div class="detail-section">
          <h3>Update status</h3>
          <div class="status-btns">
            <button class="btn-status" id="markSold">Mark as Sold</button>
            <button class="btn-status" id="markAdopted">Mark as Adopted</button>
          </div>
        </div>` : ''}
      </div>
      <aside class="detail-sidebar">
        <div class="contact-card">
          ${owner ? `
          <div class="owner-info">
            <img src="${escapeHtml(owner.avatar)}" class="owner-avatar" alt="${escapeHtml(owner.name)}">
            <div>
              <p class="owner-name">${escapeHtml(owner.name)}</p>
              <p class="owner-since">Member since ${new Date(owner.createdAt).getFullYear()}</p>
            </div>
          </div>` : `<p class="owner-name">Listed on Fur Nest</p>`}
          ${pet.status === 'available'
            ? (!isOwner && owner
                ? `<div class="contact-actions"><button class="btn-contact" id="messageOwnerBtn">💬 Message about ${escapeHtml(pet.name)}</button></div>`
                : isOwner ? `<p class="own-listing-note">This is your listing</p>` : '')
            : `<p class="not-available">This pet is no longer available</p>`}
        </div>
        <a href="marketplace.html" class="btn-back">← Back to marketplace</a>
      </aside>
    </div>`;

  document.getElementById('messageOwnerBtn')?.addEventListener('click', async () => {
    if (!user) { window.location.href = 'login.html'; return; }
    const btn = document.getElementById('messageOwnerBtn');
    btn.disabled = true; btn.textContent = 'Opening…';
    const convId = await MsgDB.getOrCreate(user.id, pet.ownerId);
    window.location.href = `messages.html?id=${convId}`;
  });

  document.getElementById('deleteBtn')?.addEventListener('click', async () => {
    if (!await showConfirm('Delete this listing?')) return;
    await DB.deletePet(pet.id);
    window.location.href = 'marketplace.html';
  });
  document.getElementById('markSold')?.addEventListener('click', async () => {
    await DB.updatePet(pet.id, { status: 'sold' });
    location.reload();
  });
  document.getElementById('markAdopted')?.addEventListener('click', async () => {
    await DB.updatePet(pet.id, { status: 'adopted' });
    location.reload();
  });
}
