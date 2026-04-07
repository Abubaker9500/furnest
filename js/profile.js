import { DB } from './data.js';
import { PetDB } from './petProfile.js';
import { FeedDB } from './feed.js';
import { uploadToCloudinary } from './petProfile.js';
import { Auth } from './auth.js';
import { db } from './firebase.js';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const currentUser = await Auth.init();
const params = new URLSearchParams(window.location.search);
const viewId = params.get('id');

let profileUser = null;
let isOwnProfile = false;

if (viewId) {
  profileUser = await DB.getUserById(viewId);
  isOwnProfile = currentUser && currentUser.id === viewId;
} else if (currentUser) {
  profileUser = currentUser;
  isOwnProfile = true;
} else {
  window.location.href = 'login.html';
}

if (!profileUser) {
  document.getElementById('profileRoot').innerHTML = '<p class="text-center py-5">User not found.</p>';
} else {
  await renderProfile(profileUser, isOwnProfile);
}

async function renderProfile(user, isOwn) {
  const pets = await DB.getPetsByOwner(user.id);
  const availableCount = pets.filter(p => p.status === 'available').length;
  document.title = `${user.name} — Fur Nest`;
  // Direct Firestore read for freshest following/followers data
  const userSnap = await getDoc(doc(db, 'users', user.id));
  const userData = userSnap.exists() ? userSnap.data() : {};
  const followingList = userData.following || [];
  const followersList = userData.followers || [];
  const followingCount = followingList.length;
  const followersCount = followersList.length;
  console.log('USER DATA:', JSON.stringify({ following: followingList, followers: followersList }));
  let isFollowingUser = false;
  if (currentUser && !isOwn) {
    const mySnap = await getDoc(doc(db, 'users', currentUser.id));
    const myData = mySnap.exists() ? mySnap.data() : {};
    isFollowingUser = (myData.following || []).includes(user.id);
  }

  const badgeMap = {
    adopt: ['Adopt','badge-adopt'],
    sell:  ['For Sale','badge-sell'],
    free:  ['Free','badge-free']
  };

  document.getElementById('profileRoot').innerHTML = `
    <div class="profile-hero">
      <div class="profile-avatar-wrap">
        <img src="${user.avatar}" alt="${user.name}" class="profile-avatar">
        ${isOwn ? `
        <div class="avatar-change-menu" id="avatarChangeMenu" style="display:none">
          <label class="avatar-option-btn" id="uploadAvatarLabel">
            📷 Upload photo
            <input type="file" id="avatarUploadInput" accept="image/*" style="display:none">
          </label>
          <button class="avatar-option-btn" id="generateAvatarBtn">🎲 Generate avatar</button>
        </div>
        <button class="change-avatar-btn" id="changeAvatarBtn">Change</button>
        <p id="avatarUploadStatus" class="upload-status mt-1" style="display:none;position:absolute;bottom:-28px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:0.72rem"></p>` : ''}
      </div>
      <div class="profile-info">
        <h1 class="profile-name">${user.name}</h1>
        <p class="profile-meta">${user.location ? `📍 ${user.location} · ` : ''}Member since ${new Date(user.createdAt).getFullYear()}</p>
        ${user.bio ? `<p class="profile-bio">${user.bio}</p>` : (isOwn ? `<p class="profile-bio placeholder-bio">Add a bio…</p>` : '')}
      </div>
      <div class="profile-stats">
        <div class="pstat pstat-clickable" id="openFollowing"><span class="pstat-num">${followingCount}</span><span class="pstat-label">Following</span></div>
        <div class="pstat pstat-clickable" id="openFollowers"><span class="pstat-num">${followersCount}</span><span class="pstat-label">Followers</span></div>
        <div class="pstat"><span class="pstat-num">${pets.length}</span><span class="pstat-label">Listings</span></div>
      </div>

      <!-- Users list modal -->
      <div id="usersModal" class="users-modal-overlay" style="display:none">
        <div class="users-modal-box">
          <div class="users-modal-header">
            <h3 id="usersModalTitle"></h3>
            <button class="users-modal-close" id="closeUsersModal">×</button>
          </div>
          <div id="usersModalList" class="users-modal-list"></div>
        </div>
      </div>
      ${isOwn
        ? `<button class="btn-edit-profile" id="editProfileBtn">Edit profile</button>`
        : currentUser ? `<button class="btn-follow-profile ${isFollowingUser ? 'following' : ''}" id="followProfileBtn">${isFollowingUser ? 'Following' : 'Follow'}</button>` : ''
      }
    </div>

    <div class="profile-body" id="petProfilesSection">
      <div class="pp-section-header mb-3">
        <h2 class="section-title mb-0">Pet profiles</h2>
        ${isOwn ? `<a href="create-pet-profile.html" class="btn-add-memory">+ New pet profile</a>` : ''}
      </div>
      <div id="petProfilesGrid" class="profile-pets-grid">
        <p class="pp-empty" id="petProfilesEmpty" style="display:none">No pet profiles yet.</p>
      </div>
    </div>

    <div class="profile-body">
      <h2 class="section-title">${isOwn ? 'My listings' : `${user.name.split(' ')[0]}'s listings`}</h2>
      ${pets.length === 0 ? `
        <div class="no-pets"><p>No listings yet.</p>${isOwn ? `<a href="add-pet.html" class="btn-add-pet">Add your first pet</a>` : ''}</div>
      ` : `
        <div class="profile-pets-grid">
          ${pets.map(pet => {
            const bKey = pet.listingType || 'adopt';
            const [label, cls] = badgeMap[bKey] || badgeMap.adopt;
            const displayLabel = bKey === 'sell' && pet.price ? '$'+pet.price : label;
            return `
            <div class="profile-pet-card">
              <a href="pet-details.html?id=${pet.id}">
                <div class="ppc-img-wrap">
                  <img src="${pet.image || 'https://placehold.co/300x200?text=No+Photo'}" alt="${pet.name}" loading="lazy">
                  <span class="listing-badge ${cls}">${displayLabel}</span>
                  ${pet.status !== 'available' ? `<span class="status-overlay">${pet.status}</span>` : ''}
                </div>
                <div class="ppc-body"><h3>${pet.name}</h3><p>${pet.breed || ''} · ${pet.age || ''}</p></div>
              </a>
              ${isOwn ? `
              <div class="ppc-actions">
                <a href="add-pet.html?edit=${pet.id}" class="ppc-btn">Edit</a>
                <button class="ppc-btn ppc-btn-del" data-id="${pet.id}">Delete</button>
              </div>` : ''}
            </div>`;
          }).join('')}
        </div>
      `}
      ${isOwn ? `<a href="add-pet.html" class="btn-add-listing">+ Add new listing</a>` : ''}
    </div>

    <!-- PET PROFILES SECTION -->

    ${isOwn ? `
    <div id="editProfileModal" class="modal-overlay" style="display:none">
      <div class="modal-box">
        <h2>Edit profile</h2>
        <form id="editProfileForm">
          <label>Name</label><input type="text" id="editName" value="${user.name}" required>
          <label>Location</label><input type="text" id="editLocation" value="${user.location || ''}">
          <label>Bio</label><textarea id="editBio" rows="3">${user.bio || ''}</textarea>
          <label>Phone</label><input type="tel" id="editPhone" value="${user.phone || ''}">
          <div class="modal-actions">
            <button type="submit" class="btn-save">Save</button>
            <button type="button" class="btn-cancel" id="cancelEditBtn">Cancel</button>
          </div>
        </form>
      </div>
    </div>` : ''}
  `;

  // Load pet profiles
  try {
    console.log('Loading pet profiles for userId:', user.id);
    const petProfiles = await PetDB.getProfilesByOwner(user.id);
    console.log('Pet profiles found:', petProfiles.length, petProfiles);
    // Filter: non-owners only see public profiles
    const visibleProfiles = isOwn ? petProfiles : petProfiles.filter(p => p.visibility === 'public');
    const grid = document.getElementById('petProfilesGrid');
    const empty = document.getElementById('petProfilesEmpty');
    if (grid) {
      if (visibleProfiles.length === 0) {
        empty.style.display = '';
      } else {
        const typeEmoji = { dog:'🐕', cat:'🐈', bird:'🦜', rabbit:'🐰', fish:'🐟', other:'🐾' };
        grid.innerHTML = visibleProfiles.map(p => `
          <div class="profile-pet-card">
            <a href="pet-profile.html?id=${p.id}">
              <div class="ppc-img-wrap">
                <img src="${p.avatar || 'https://placehold.co/300x200?text=🐾'}" alt="${p.name}" loading="lazy">
                ${p.visibility === 'private' ? '<span class="status-overlay" style="font-size:.75rem">Private</span>' : ''}
              </div>
              <div class="ppc-body">
                <h3>${p.name} ${typeEmoji[p.type]||'🐾'}</h3>
                <p>${p.breed || p.type || ''}</p>
              </div>
            </a>
            ${isOwn ? `
            <div class="ppc-actions">
              <a href="pet-profile.html?id=${p.id}" class="ppc-btn">View</a>
              <a href="create-pet-profile.html?edit=${p.id}" class="ppc-btn">Edit</a>
            </div>` : ''}
          </div>`).join('');
      }
    }
  } catch(e) { console.error('Pet profiles:', e); }

  // Delete buttons
  document.querySelectorAll('.ppc-btn-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this listing?')) return;
      await DB.deletePet(btn.dataset.id);
      location.reload();
    });
  });

  if (isOwn) {
    // Following / Followers modal
  async function showUsersModal(title, userIds) {
    document.getElementById('usersModalTitle').textContent = title;
    document.getElementById('usersModal').style.display = 'flex';
    const list = document.getElementById('usersModalList');
    list.innerHTML = '<p class="pp-empty">Loading…</p>';

    if (!userIds || userIds.length === 0) {
      list.innerHTML = '<p class="pp-empty">No users yet.</p>';
      return;
    }

    // Fetch each user
    const users = await Promise.all(userIds.map(id => DB.getUserById(id)));
    const valid = users.filter(Boolean);

    if (!valid.length) { list.innerHTML = '<p class="pp-empty">No users found.</p>'; return; }

    list.innerHTML = valid.map(u => `
      <a href="profile.html?id=${u.id}" class="users-modal-item">
        <img src="${u.avatar || 'https://placehold.co/44x44?text=🐾'}" class="users-modal-avatar" alt="${u.name}">
        <div class="users-modal-info">
          <span class="users-modal-name">${u.name}</span>
          ${u.location ? `<span class="users-modal-meta">📍 ${u.location}</span>` : ''}
        </div>
      </a>`).join('');
  }

  document.getElementById('openFollowing')?.addEventListener('click', () => {
    showUsersModal(`Following (${followingCount})`, followingList);
  });

  document.getElementById('openFollowers')?.addEventListener('click', () => {
    showUsersModal(`Followers (${followersCount})`, followersList);
  });

  document.getElementById('closeUsersModal')?.addEventListener('click', () => {
    document.getElementById('usersModal').style.display = 'none';
  });

  document.getElementById('usersModal')?.addEventListener('click', e => {
    if (e.target.id === 'usersModal') document.getElementById('usersModal').style.display = 'none';
  });



  document.getElementById('editProfileBtn')?.addEventListener('click', () => {
      document.getElementById('editProfileModal').style.display = 'flex';
    });
    document.getElementById('cancelEditBtn')?.addEventListener('click', () => {
      document.getElementById('editProfileModal').style.display = 'none';
    });
    document.getElementById('editProfileForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      await DB.updateUser(currentUser.id, {
        name:     document.getElementById('editName').value.trim(),
        location: document.getElementById('editLocation').value.trim(),
        bio:      document.getElementById('editBio').value.trim(),
        phone:    document.getElementById('editPhone').value.trim()
      });
      location.reload();
    });
    // Toggle avatar menu
    document.getElementById('changeAvatarBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = document.getElementById('avatarChangeMenu');
      menu.style.display = menu.style.display === 'none' ? '' : 'none';
    });

    // Close menu when clicking outside
    document.addEventListener('click', () => {
      const menu = document.getElementById('avatarChangeMenu');
      if (menu) menu.style.display = 'none';
    });

    // Upload photo
    document.getElementById('avatarUploadInput')?.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      const status = document.getElementById('avatarUploadStatus');
      status.textContent = 'Uploading…'; status.className = 'upload-status info'; status.style.display = '';
      document.getElementById('avatarChangeMenu').style.display = 'none';
      try {
        const url = await uploadToCloudinary(file, pct => {
          status.textContent = `Uploading… ${pct}%`;
        });
        await DB.updateUser(currentUser.id, { avatar: url });
        status.textContent = 'Done!'; status.className = 'upload-status success';
        setTimeout(() => location.reload(), 600);
      } catch {
        status.textContent = 'Upload failed.'; status.className = 'upload-status error';
      }
    });

    // Generate animated avatar
    document.getElementById('generateAvatarBtn')?.addEventListener('click', async () => {
      const seed = prompt('Enter a seed word for your avatar (any word or your name):');
      if (!seed) return;
      document.getElementById('avatarChangeMenu').style.display = 'none';
      const newAvatar = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
      await DB.updateUser(currentUser.id, { avatar: newAvatar });
      location.reload();
    });
  }

  // Follow / Unfollow button — outside isOwn block so it works on other profiles
  document.getElementById('followProfileBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('followProfileBtn');
    const isF = btn.classList.contains('following');
    btn.disabled = true;
    btn.textContent = isF ? 'Unfollowing…' : 'Following…';
    try {
      if (isF) {
        await updateDoc(doc(db, 'users', currentUser.id), { following: arrayRemove(user.id) });
        await updateDoc(doc(db, 'users', user.id), { followers: arrayRemove(currentUser.id) });
      } else {
        await updateDoc(doc(db, 'users', currentUser.id), { following: arrayUnion(user.id) });
        await updateDoc(doc(db, 'users', user.id), { followers: arrayUnion(currentUser.id) });
      }
      location.reload();
    } catch(e) {
      console.error('Follow/unfollow error:', e.code, e.message);
      btn.textContent = isF ? 'Following' : 'Follow';
      btn.disabled = false;
    }
  });
}
