import { DB } from './data.js';
import { Auth } from './auth.js';

await Auth.init();

function cleanImageUrl(url) {
  return url ? url.replace('http://', 'https://') : '';
}

// ── PET HELPERS ───────────────────────────────────────────────────────────────
function getPetBadge(pet) {
  const map = {
    adopt: { label: 'Adopt', cls: 'badge-adopt' },
    sell:  { label: pet.price ? `$${pet.price}` : 'For sale', cls: 'badge-sell' },
    free:  { label: 'Free', cls: 'badge-free' }
  };
  return map[pet.listingType] || map.adopt;
}

function getPetTypeIcon(type) {
  const icons = { dog: '🐕', cat: '🐈', bird: '🦜', rabbit: '🐇', fish: '🐟', reptile: '🦎', hamster: '🐹' };
  return icons[type] || '🐾';
}

function getStatusBadge(status) {
  if (status === 'sold')    return '<span class="status-badge status-sold">Sold</span>';
  if (status === 'adopted') return '<span class="status-badge status-adopted">Adopted</span>';
  return '';
}

// ── ITEM HELPERS ──────────────────────────────────────────────────────────────
const ITEM_CATEGORIES = {
  food:        { label: 'Food & Treats',    icon: '🍖' },
  care:        { label: 'Grooming & Care',  icon: '🧴' },
  clothes:     { label: 'Clothes',          icon: '👕' },
  accessories: { label: 'Accessories',      icon: '🎀' },
  toys:        { label: 'Toys',             icon: '🎾' },
  other:       { label: 'Other',            icon: '📦' },
};

function getItemCategoryInfo(cat) {
  return ITEM_CATEGORIES[cat] || ITEM_CATEGORIES.other;
}

const ITEM_CONDITIONS = { new: 'New', 'like-new': 'Like New', used: 'Used' };

function getItemBadge(item) {
  if (item.listingType === 'free') return { label: 'Free', cls: 'badge-free' };
  return { label: item.price ? `$${item.price}` : 'For sale', cls: 'badge-sell' };
}

// ── STATE ─────────────────────────────────────────────────────────────────────
let allPets = [];
let allItems = [];
let currentTab = 'pets';
let currentPetFilter = 'all';
let currentItemFilter = 'all';
let currentSearch = '';

// ── RENDER PETS ───────────────────────────────────────────────────────────────
function renderPets() {
  const q = currentSearch.toLowerCase();
  const KNOWN_FILTER_TYPES = ['dog', 'cat', 'bird', 'rabbit'];
  const pets = allPets.filter(pet => {
    const matchType = currentPetFilter === 'all'
      || (currentPetFilter === 'other' && !KNOWN_FILTER_TYPES.includes(pet.type))
      || pet.type === currentPetFilter;
    const matchSearch = !q
      || (pet.name || '').toLowerCase().includes(q)
      || (pet.breed || '').toLowerCase().includes(q)
      || (pet.location || '').toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  const grid = document.getElementById('petList');
  if (!pets.length) {
    grid.innerHTML = `<div class="no-results"><p>No pets found. <a href="add-pet.html">Add the first one!</a></p></div>`;
    return;
  }
  grid.innerHTML = pets.map(pet => {
    const badge = getPetBadge(pet);
    return `
      <div class="col-sm-6 col-lg-4">
        <div class="pet-card" onclick="window.location.href='pet-details.html?id=${pet.id}'">
          <div class="pet-card-img-wrap">
            <img src="${cleanImageUrl(pet.image) || 'https://placehold.co/400x300?text=No+Photo'}" alt="${pet.name}" loading="lazy">
            <span class="listing-badge ${badge.cls}">${badge.label}</span>
            ${getStatusBadge(pet.status)}
          </div>
          <div class="pet-card-body">
            <div class="pet-card-top">
              <h3>${pet.name}</h3>
              <span class="pet-type-icon">${getPetTypeIcon(pet.type)}</span>
            </div>
            <p class="pet-breed">${pet.breed || ''}</p>
            <div class="pet-card-meta">
              <span>📍 ${pet.location || 'Unknown'}</span>
              <span>${pet.age || ''}</span>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── RENDER ITEMS ──────────────────────────────────────────────────────────────
function renderItems() {
  const q = currentSearch.toLowerCase();
  const items = allItems.filter(item => {
    const matchCat = currentItemFilter === 'all' || item.category === currentItemFilter;
    const matchSearch = !q
      || (item.title || '').toLowerCase().includes(q)
      || (item.description || '').toLowerCase().includes(q)
      || (item.location || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const grid = document.getElementById('itemList');
  if (!items.length) {
    grid.innerHTML = `<div class="no-results"><p>No items found. <a href="add-item.html">List the first one!</a></p></div>`;
    return;
  }
  grid.innerHTML = items.map(item => {
    const badge = getItemBadge(item);
    const cat = getItemCategoryInfo(item.category);
    const condition = ITEM_CONDITIONS[item.condition] || '';
    return `
      <div class="col-sm-6 col-lg-4">
        <div class="pet-card" onclick="window.location.href='item-details.html?id=${item.id}'">
          <div class="pet-card-img-wrap">
            <img src="${cleanImageUrl(item.image) || 'https://placehold.co/400x300?text=No+Photo'}" alt="${item.title}" loading="lazy">
            <span class="listing-badge ${badge.cls}">${badge.label}</span>
            ${item.status === 'sold' ? '<span class="status-badge status-sold">Sold</span>' : ''}
          </div>
          <div class="pet-card-body">
            <div class="pet-card-top">
              <h3>${item.title}</h3>
              <span class="pet-type-icon">${cat.icon}</span>
            </div>
            <p class="pet-breed">${cat.label}</p>
            <div class="pet-card-meta">
              <span>📍 ${item.location || 'Unknown'}</span>
              ${condition ? `<span class="item-condition">${condition}</span>` : ''}
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── TAB SWITCHING ─────────────────────────────────────────────────────────────
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.market-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('petsSection').style.display  = tab === 'pets'  ? '' : 'none';
  document.getElementById('itemsSection').style.display = tab === 'items' ? '' : 'none';
  document.getElementById('petFilters').style.display   = tab === 'pets'  ? '' : 'none';
  document.getElementById('itemFilters').style.display  = tab === 'items' ? '' : 'none';
  document.getElementById('addPetBtn').style.display    = tab === 'pets'  ? '' : 'none';
  document.getElementById('addItemBtn').style.display   = tab === 'items' ? '' : 'none';
  if (tab === 'pets') renderPets(); else renderItems();
}

document.querySelectorAll('.market-tab').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ── PET FILTERS ───────────────────────────────────────────────────────────────
document.getElementById('petFilters').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn[data-type]');
  if (!btn) return;
  document.querySelectorAll('#petFilters .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentPetFilter = btn.dataset.type;
  renderPets();
});

// ── ITEM FILTERS ──────────────────────────────────────────────────────────────
document.getElementById('itemFilters').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn[data-cat]');
  if (!btn) return;
  document.querySelectorAll('#itemFilters .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentItemFilter = btn.dataset.cat;
  renderItems();
});

// ── SEARCH ────────────────────────────────────────────────────────────────────
document.getElementById('searchBar').addEventListener('input', e => {
  currentSearch = e.target.value;
  if (currentTab === 'pets') renderPets(); else renderItems();
});

// ── LOAD DATA ─────────────────────────────────────────────────────────────────
try { allPets  = await DB.getPets();  } catch(e) { console.error('Failed to load pets:', e); }
try { allItems = await DB.getItems(); } catch(e) { console.error('Failed to load items:', e); }

document.getElementById('petsLoading')?.remove();
document.getElementById('itemsLoading')?.remove();

// Auto-switch tab if ?tab=items is in the URL
const tabParam = new URLSearchParams(window.location.search).get('tab');
if (tabParam === 'items') {
  switchTab('items');
} else {
  renderPets();
}
