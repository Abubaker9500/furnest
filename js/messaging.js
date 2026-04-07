import { db } from './firebase.js';
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc,
  query, where, orderBy, limit, serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const MsgDB = {
  convId(uid1, uid2) {
    return [uid1, uid2].sort().join('_');
  },

  async getOrCreate(myId, otherId) {
    const id = this.convId(myId, otherId);
    const ref = doc(db, 'conversations', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        participants: [myId, otherId],
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        lastMessageBy: myId,
        unread: { [myId]: 0, [otherId]: 0 }
      });
    }
    return id;
  },

  async getMyConversations(myId) {
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', myId),
      orderBy('lastMessageAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getMessages(convId) {
    const q = query(
      collection(db, 'conversations', convId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async sendMessage(convId, senderId, text, participants) {
    await addDoc(collection(db, 'conversations', convId, 'messages'), {
      text,
      senderId,
      createdAt: serverTimestamp()
    });
    const otherId = participants.find(id => id !== senderId);
    const unreadUpdate = {};
    unreadUpdate[`unread.${otherId}`] = increment(1);
    await updateDoc(doc(db, 'conversations', convId), {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
      lastMessageBy: senderId,
      ...unreadUpdate
    });
  },

  async markRead(convId, userId) {
    const update = {};
    update[`unread.${userId}`] = 0;
    await updateDoc(doc(db, 'conversations', convId), update);
  },

  async getTotalUnread(myId) {
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', myId)
    );
    const snap = await getDocs(q);
    return snap.docs.reduce((sum, d) => sum + (d.data().unread?.[myId] || 0), 0);
  }
};

export { MsgDB };
