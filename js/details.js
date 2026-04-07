import { DB } from './data.js';
import { Auth } from './auth.js';

const user = await Auth.init();
const params = new URLSearchParams(window.location.search);
const petId = params.get('id');

if (!petId) { window.location.href = 'index.html'; }

const pet = await DB.getPetById(petId);
if (!pet) {
  document.getElementById('detailsRoot').innerHTML = '<p class="text-center py-5">Pet not found. <a href="index.html">Go back</a></p>';
} else {
  const isOwner = user && user.id === pet.ownerId;
  const owner = pet.ownerId ? await DB.getUserById(pet.ownerId) : null;

  document.title = `${pet.name} — Fur Nest`;

  const badgeMap = {
    adopt: `<span class="detail-badge badge-adopt">For Adoption</span>`,
    sell:  `<span class="detail-badge badge-sell">${pet.price ? '$' + pet.price : 'For Sale'}</span>`,
    free:  `<span class="detail-badge badge-free">Free to Good Home</span>`
  };
  const statusMap = {
    sold:      `<span class="detail-status status-sold">Sold</span>`,
    adopted:   `<span class="detail-status status-adopted">Adopted</span>`,
    available: ''
  };

  const healthTags = pet.health || (pet.vaccinated ? ['Vaccinated'] : []);

  document.getElementById('detailsRoot').innerHTML = `
    <div class="detail-hero">
      <img src="${pet.image || 'https://placehold.co/800x500?text=No+Photo'}" alt="${pet.name}" class="detail-img">
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
            <h1 class="detail-name">${pet.name}</h1>
            <p class="detail-breed">${pet.breed || ''} ${pet.type ? '· ' + pet.type.charAt(0).toUpperCase() + pet.type.slice(1) : ''}</p>
          </div>
          ${isOwner ? `
          <div class="owner-actions">
            <a href="add-pet.html?edit=${pet.id}" class="btn-edit">Edit</a>
            <button class="btn-delete" id="deleteBtn">Delete</button>
          </div>` : ''}
        </div>
        <div class="detail-stats">
          <div class="stat-box"><span class="stat-label">Age</span><span class="stat-value">${pet.age || '—'}</span></div>
          <div class="stat-box"><span class="stat-label">Gender</span><span class="stat-value">${pet.gender || '—'}</span></div>
          <div class="stat-box"><span class="stat-label">Location</span><span class="stat-value">${pet.location || '—'}</span></div>
          <div class="stat-box"><span class="stat-label">Status</span><span class="stat-value">${pet.status ? pet.status.charAt(0).toUpperCase() + pet.status.slice(1) : 'Available'}</span></div>
        </div>
        ${healthTags.length ? `
        <div class="detail-section">
          <h3>Health &amp; traits</h3>
          <div class="health-tags">${healthTags.map(t => `<span class="health-tag">${t}</span>`).join('')}</div>
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
            <img src="${owner.avatar}" class="owner-avatar" alt="${owner.name}">
            <div>
              <p class="owner-name">${owner.name}</p>
              <p class="owner-since">Member since ${new Date(owner.createdAt).getFullYear()}</p>
            </div>
          </div>` : `<p class="owner-name">Listed on Fur Nest</p>`}
          ${pet.status === 'available'
            ? (!isOwner && owner
                ? `<div class="contact-actions"><a href="mailto:${owner.email}?subject=Interested in ${pet.name}&body=Hi, I saw ${pet.name} on Fur Nest and I'm interested!" class="btn-contact">Email about ${pet.name}</a></div>`
                : isOwner ? `<p class="own-listing-note">This is your listing</p>` : '')
            : `<p class="not-available">This pet is no longer available</p>`}
        </div>
        <a href="index.html" class="btn-back">← Back to all pets</a>
      </aside>
    </div>`;

  document.getElementById('deleteBtn')?.addEventListener('click', async () => {
    if (!confirm('Delete this listing?')) return;
    await DB.deletePet(pet.id);
    window.location.href = 'index.html';
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
