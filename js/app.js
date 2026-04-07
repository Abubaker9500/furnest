import { DB } from './data.js';
import { Auth } from './auth.js';

await Auth.init();

function cleanImageUrl(url) {
  if (!url) return '';
  // Ensure https
  return url.replace('http://', 'https://');
}


function getBadge(pet) {
  const map = {
    adopt: { label: 'Adopt', cls: 'badge-adopt' },
    sell:  { label: pet.price ? `$${pet.price}` : 'For sale', cls: 'badge-sell' },
    free:  { label: 'Free', cls: 'badge-free' }
  };
  return map[pet.listingType] || map.adopt;
}

function getStatusBadge(pet) {
  if (pet.status === 'sold')    return '<span class="status-badge status-sold">Sold</span>';
  if (pet.status === 'adopted') return '<span class="status-badge status-adopted">Adopted</span>';
  return '';
}

let allPets = [];
let currentFilter = 'all';
let currentSearch = '';

function renderPets() {
  const pets = allPets.filter(pet => {
    const matchType = currentFilter === 'all' || pet.type === currentFilter;
    const q = currentSearch.toLowerCase();
    const matchSearch = !q
      || pet.name.toLowerCase().includes(q)
      || (pet.breed || '').toLowerCase().includes(q)
      || (pet.location || '').toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  const grid = document.getElementById('petList');
  if (pets.length === 0) {
    grid.innerHTML = `<div class="no-results"><p>No pets found. <a href="add-pet.html">Add the first one!</a></p></div>`;
    return;
  }
  grid.innerHTML = pets.map(pet => {
    const badge = getBadge(pet);
    return `
      <div class="col-sm-6 col-lg-4">
        <div class="pet-card" onclick="window.location.href='pet-details.html?id=${pet.id}'">
          <div class="pet-card-img-wrap">
            <img src="${cleanImageUrl(pet.image) || 'https://placehold.co/400x300?text=No+Photo'}" alt="${pet.name}" loading="lazy">
            <span class="listing-badge ${badge.cls}">${badge.label}</span>
            ${getStatusBadge(pet)}
          </div>
          <div class="pet-card-body">
            <div class="pet-card-top">
              <h3>${pet.name}</h3>
              <span class="pet-type-icon">${pet.type === 'dog' ? '🐕' : '🐈'}</span>
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

// Load pets then render
const loadingEl = document.getElementById('petsLoading');
try {
  allPets = await DB.getPets();
} catch(e) {
  console.error(e);
}
if (loadingEl) loadingEl.remove();
renderPets();

document.getElementById('searchBar').addEventListener('input', e => {
  currentSearch = e.target.value;
  renderPets();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.type;
    renderPets();
  });
});
