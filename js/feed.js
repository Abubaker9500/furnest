import { db } from './firebase.js';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, orderBy, query, serverTimestamp, where, limit, arrayUnion, arrayRemove, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { NotifDB } from './notifications.js';

const CLOUD  = 'diw92tmar';
const PRESET = 'psjvaata';

const FeedDB = {
  async createPost(data, followerIds) {
    data.createdAt = serverTimestamp();
    data.likes = [];
    data.likeCount = 0;
    const ref = await addDoc(collection(db, 'posts'), data);
    // Notify all followers
    if (followerIds && followerIds.length) {
      for (const fid of followerIds) {
        await NotifDB.create(fid, {
          type: 'post',
          fromId: data.ownerId,
          fromName: data.ownerName,
          fromAvatar: data.ownerAvatar || '',
          text: `${data.ownerName} shared a new post`,
          link: `index.html`
        });
      }
    }
    return { id: ref.id, ...data };
  },

  async getDiscoveryFeed() {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(40));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getFollowingFeed(followingIds) {
    if (!followingIds.length) return [];
    const chunks = [];
    for (let i = 0; i < followingIds.length; i += 30) chunks.push(followingIds.slice(i, i+30));
    const posts = [];
    for (const chunk of chunks) {
      const q = query(collection(db, 'posts'), where('ownerId', 'in', chunk), orderBy('createdAt', 'desc'), limit(40));
      const snap = await getDocs(q);
      snap.docs.forEach(d => posts.push({ id: d.id, ...d.data() }));
    }
    return posts.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
  },

  async deletePost(id) {
    await deleteDoc(doc(db, 'posts', id));
  },

  async toggleLike(postId, userId, userName, userAvatar) {
    const ref = doc(db, 'posts', postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const post = snap.data();
    const likes = post.likes || [];
    const liked = likes.includes(userId);
    await updateDoc(ref, {
      likes: liked ? arrayRemove(userId) : arrayUnion(userId),
      likeCount: increment(liked ? -1 : 1)
    });
    // Notify post owner when liked (not when unliked, and not your own post)
    if (!liked && post.ownerId && post.ownerId !== userId) {
      await NotifDB.create(post.ownerId, {
        type: 'like',
        fromId: userId,
        fromName: userName || 'Someone',
        fromAvatar: userAvatar || '',
        text: `${userName || 'Someone'} liked your post`,
        link: 'index.html'
      });
    }
    return !liked;
  },

  async getFollowing(userId) {
    const snap = await getDoc(doc(db, 'users', userId));
    return snap.exists() ? (snap.data().following || []) : [];
  },

  async followUser(currentUserId, targetUserId, currentUserName, currentUserAvatar) {
    try {
      await updateDoc(doc(db, 'users', currentUserId), { following: arrayUnion(targetUserId) });
    } catch(e) { console.error('follow - add to following failed:', e); }
    try {
      await updateDoc(doc(db, 'users', targetUserId), { followers: arrayUnion(currentUserId) });
    } catch(e) { console.error('follow - add to followers failed:', e); }
    // Notify the followed user
    await NotifDB.create(targetUserId, {
      type: 'follow',
      fromId: currentUserId,
      fromName: currentUserName || 'Someone',
      fromAvatar: currentUserAvatar || '',
      text: `${currentUserName} started following you`,
      link: `profile.html?id=${currentUserId}`
    });
  },

  async unfollowUser(currentUserId, targetUserId) {
    try {
      await updateDoc(doc(db, 'users', currentUserId), { following: arrayRemove(targetUserId) });
    } catch(e) { console.error('unfollow - remove from following failed:', e); }
    try {
      await updateDoc(doc(db, 'users', targetUserId), { followers: arrayRemove(currentUserId) });
    } catch(e) { console.error('unfollow - remove from followers failed:', e); }
  },

  async isFollowing(currentUserId, targetUserId) {
    const following = await this.getFollowing(currentUserId);
    return following.includes(targetUserId);
  }
};

async function uploadPhoto(file, onProgress) {
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
        resolve((res.secure_url || '').replace('http://', 'https://'));
      } else reject(new Error('Upload failed'));
    });
    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.send(fd);
  });
}

export { FeedDB, uploadPhoto };
