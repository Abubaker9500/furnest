import { DB } from './data.js';
import { Auth } from './auth.js';
import { MsgDB } from './messaging.js';
import { showConfirm } from './confirm.js';

const user = await Auth.init();
if (!user) { window.location.href = 'login.html'; }

const params = new URLSearchParams(window.location.search);
const itemId = params.get('id');

if (!itemId) { window.location.href = 'marketplace.html'; }

const ITEM_CATEGORIES = {
  food:        { label: 'Food & Treats',    icon: '🍖' },
  care:        { label: 'Grooming & Care',  icon: '🧴' },
  clothes:     { label: 'Clothes',          icon: '👕' },
  accessories: { label: 'Accessories',      icon: '🎀' },
  toys:        { label: 'Toys',             icon: '🎾' },
  other:       { label: 'Other',            icon: '📦' },
};

const CONDITIONS = { new: 'New', 'like-new': 'Like New', used: 'Used' };

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const item = await DB.getItemById(itemId);
if (!item) {
  document.getElementById('detailsRoot').innerHTML = '<p class="text-center py-5">Item not found. <a href="marketplace.html">Back to marketplace</a></p>';
} else {
  const isOwner = user.id === item.ownerId;
  const owner = item.ownerId ? await DB.getUserById(item.ownerId) : null;
  const cat = ITEM_CATEGORIES[item.category] || ITEM_CATEGORIES.other;
  const condition = CONDITIONS[item.condition] || '';

  document.title = `${item.title} — Fur Nest`;

  const badgeMap = {
    sell: `<span class="detail-badge badge-sell">${item.price ? '$' + item.price : 'For Sale'}</span>`,
    free: `<span class="detail-badge badge-free">Free</span>`
  };

  const root = document.getElementById('detailsRoot');
  root.innerHTML = `
    <div class="detail-hero">
      <img src="${item.image ? item.image.replace('http://', 'https://') : 'https://placehold.co/800x500?text=No+Photo'}"
           alt="${escapeHtml(item.title)}" class="detail-img">
      <div class="detail-overlay">
        <div class="detail-badges">
          ${badgeMap[item.listingType] || ''}
          ${item.status === 'sold' ? '<span class="detail-status status-sold">Sold</span>' : ''}
        </div>
      </div>
    </div>
    <div class="detail-body">
      <div class="detail-main">
        <div class="detail-header">
          <div>
            <h1 class="detail-name">${escapeHtml(item.title)}</h1>
            <p class="detail-breed">${cat.icon} ${cat.label}${condition ? ' · ' + condition : ''}</p>
          </div>
          ${isOwner ? `
          <div class="owner-actions">
            <a href="add-item.html?edit=${item.id}" class="btn-edit">Edit</a>
            <button class="btn-delete" id="deleteBtn">Delete</button>
          </div>` : ''}
        </div>

        <div class="detail-stats">
          <div class="stat-box"><span class="stat-label">Category</span><span class="stat-value">${cat.label}</span></div>
          <div class="stat-box"><span class="stat-label">Condition</span><span class="stat-value">${condition || '—'}</span></div>
          <div class="stat-box"><span class="stat-label">Location</span><span class="stat-value">${escapeHtml(item.location) || '—'}</span></div>
          <div class="stat-box"><span class="stat-label">Status</span><span class="stat-value">${item.status === 'sold' ? 'Sold' : 'Available'}</span></div>
        </div>

        ${item.description ? `
        <div class="detail-section">
          <h3>Description</h3>
          <p style="line-height:1.7; color:var(--text-muted)">${escapeHtml(item.description)}</p>
        </div>` : ''}

        ${isOwner && item.status !== 'sold' ? `
        <div class="detail-section">
          <h3>Update status</h3>
          <div class="status-btns">
            <button class="btn-status" id="markSold">Mark as Sold</button>
          </div>
        </div>` : ''}
      </div>

      <aside class="detail-sidebar">
        <div class="contact-card">
          ${owner ? `
          <div class="owner-info">
            <img src="${owner.avatar}" class="owner-avatar" alt="${escapeHtml(owner.name)}">
            <div>
              <p class="owner-name">${escapeHtml(owner.name)}</p>
              <p class="owner-since">Member since ${new Date(owner.createdAt).getFullYear()}</p>
            </div>
          </div>` : `<p class="owner-name">Listed on Fur Nest</p>`}
          ${item.status !== 'sold'
            ? (!isOwner && owner
                ? `<div class="contact-actions"><button class="btn-contact" id="messageOwnerBtn">💬 Message seller</button></div>`
                : isOwner ? `<p class="own-listing-note">This is your listing</p>` : '')
            : `<p class="not-available">This item has been sold</p>`}
        </div>
        <a href="marketplace.html" class="btn-back">← Back to marketplace</a>
      </aside>
    </div>`;

  document.getElementById('messageOwnerBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('messageOwnerBtn');
    btn.disabled = true; btn.textContent = 'Opening…';
    const convId = await MsgDB.getOrCreate(user.id, item.ownerId);
    window.location.href = `messages.html?id=${convId}`;
  });

  document.getElementById('deleteBtn')?.addEventListener('click', async () => {
    if (!await showConfirm('Delete this listing?')) return;
    await DB.deleteItem(item.id);
    window.location.href = 'marketplace.html';
  });

  document.getElementById('markSold')?.addEventListener('click', async () => {
    await DB.updateItem(item.id, { status: 'sold' });
    location.reload();
  });
}
