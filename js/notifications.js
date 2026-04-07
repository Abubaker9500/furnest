import { db } from './firebase.js';
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, where, limit, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const NotifDB = {
  // Create a notification for a user
  async create(userId, data) {
    if (!userId) return;
    await addDoc(collection(db, 'users', userId, 'notifications'), {
      ...data,
      read: false,
      createdAt: serverTimestamp()
    });
  },

  // Get all notifications for current user
  async getAll(userId) {
    const q = query(
      collection(db, 'users', userId, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // Get unread count
  async getUnreadCount(userId) {
    const q = query(
      collection(db, 'users', userId, 'notifications'),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    return snap.size;
  },

  // Mark one as read
  async markRead(userId, notifId) {
    await updateDoc(doc(db, 'users', userId, 'notifications', notifId), { read: true });
  },

  // Mark all as read
  async markAllRead(userId) {
    const q = query(collection(db, 'users', userId, 'notifications'), where('read', '==', false));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
  }
};

export { NotifDB };
