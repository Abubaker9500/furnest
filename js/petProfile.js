import { db } from './firebase.js';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, orderBy, query, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const PetDB = {
  async createProfile(data) {
    data.createdAt = serverTimestamp();
    const ref = await addDoc(collection(db, 'petProfiles'), data);
    return { id: ref.id, ...data };
  },
  async getProfile(id) {
    const snap = await getDoc(doc(db, 'petProfiles', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },
  async getProfilesByOwner(userId) {
    // No orderBy to avoid composite index requirement
    const q = query(collection(db, 'petProfiles'), where('ownerId', '==', userId));
    const snap = await getDocs(q);
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort client-side
    return results.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  },
  async updateProfile(id, updates) {
    await updateDoc(doc(db, 'petProfiles', id), updates);
  },
  async deleteProfile(id) {
    const mSnap = await getDocs(collection(db, 'petProfiles', id, 'memories'));
    for (const m of mSnap.docs) await deleteDoc(m.ref);
    await deleteDoc(doc(db, 'petProfiles', id));
  },
  async addMemory(petId, memory) {
    memory.createdAt = serverTimestamp();
    const ref = await addDoc(collection(db, 'petProfiles', petId, 'memories'), memory);
    return { id: ref.id, ...memory };
  },
  async getMemories(petId) {
    const q = query(collection(db, 'petProfiles', petId, 'memories'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async deleteMemory(petId, memoryId) {
    await deleteDoc(doc(db, 'petProfiles', petId, 'memories', memoryId));
  }
};

export { PetDB };

// ── Cloudinary upload ──────────────────────────────────────────
const CLOUD  = 'diw92tmar';
const PRESET = 'psjvaata';

export async function uploadToCloudinary(file, onProgress) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', PRESET);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable && onProgress) onProgress(Math.round(e.loaded / e.total * 100));
    });
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText);
        resolve((res.secure_url || res.url || '').replace('http://', 'https://'));
      } else {
        console.error('Cloudinary error:', xhr.responseText);
        reject(new Error('Upload failed'));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.send(fd);
  });
}
