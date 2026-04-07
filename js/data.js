import { db, auth, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc, collection, query, where, orderBy, serverTimestamp } from './firebase.js';

const DB = {
  // ── PETS ──────────────────────────────────────────
  async getPets() {
    const q = query(collection(db, 'pets'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async addPet(pet) {
    pet.createdAt = serverTimestamp();
    pet.status = pet.status || 'available';
    const ref = await addDoc(collection(db, 'pets'), pet);
    return { id: ref.id, ...pet };
  },

  async getPetById(id) {
    const snap = await getDoc(doc(db, 'pets', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async updatePet(id, updates) {
    await updateDoc(doc(db, 'pets', id), updates);
    return true;
  },

  async deletePet(id) {
    await deleteDoc(doc(db, 'pets', id));
  },

  async getPetsByOwner(userId) {
    const q = query(collection(db, 'pets'), where('ownerId', '==', userId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // ── USERS ─────────────────────────────────────────
  async getUserById(id) {
    const snap = await getDoc(doc(db, 'users', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async updateUser(id, updates) {
    await updateDoc(doc(db, 'users', id), updates);
    return true;
  }
};

export { DB };
