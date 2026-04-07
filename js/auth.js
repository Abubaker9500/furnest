import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, doc, setDoc, getDoc } from './firebase.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { MsgDB } from './messaging.js';

const Auth = {
  currentUser: null,

  // Call once on every page — resolves when Firebase knows the auth state
  init() {
    return new Promise(resolve => {
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          this.currentUser = snap.exists() ? { id: snap.id, ...snap.data() } : null;
        } else {
          this.currentUser = null;
        }
        resolve(this.currentUser);
        this._renderNav();
      });
    });
  },

  getCurrentUser() {
    return this.currentUser;
  },

  isLoggedIn() {
    return !!this.currentUser;
  },

  async register(name, email, password) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = {
        id: cred.user.uid,
        name,
        email,
        avatar: `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(email)}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
        bio: '',
        location: '',
        phone: '',
        following: [],
        followers: [],
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', cred.user.uid), user);
      this.currentUser = user;
      return { ok: true, user };
    } catch (e) {
      return { ok: false, error: this._friendlyError(e.code) };
    }
  },

  async login(email, password) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will fire and set currentUser
      return { ok: true };
    } catch (e) {
      return { ok: false, error: this._friendlyError(e.code) };
    }
  },

  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: this._friendlyError(e.code) };
    }
  },

  async logout() {
    await signOut(auth);
    window.location.href = 'login.html';
  },

  _friendlyError(code) {
    const map = {
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/user-not-found': 'Incorrect email or password.',
      'auth/wrong-password': 'Incorrect email or password.',
      'auth/invalid-credential': 'Incorrect email or password.',
      'auth/too-many-requests': 'Too many attempts. Please try again later.'
    };
    return map[code] || 'Something went wrong. Please try again.';
  },

  async _renderNav() {
    const navRight = document.getElementById('nav-auth');
    if (!navRight) return;
    if (this.currentUser) {
      // Get unread notification + message counts
      let unread = 0;
      let msgUnread = 0;
      try {
        const q = query(collection(db, 'users', this.currentUser.id, 'notifications'), where('read', '==', false));
        const snap = await getDocs(q);
        unread = snap.size;
      } catch(e) {}
      try {
        msgUnread = await MsgDB.getTotalUnread(this.currentUser.id);
      } catch(e) {}

      navRight.innerHTML = `
        <a href="messages.html" class="nav-bell" title="Messages">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          ${msgUnread > 0 ? `<span class="nav-bell-badge">${msgUnread > 9 ? '9+' : msgUnread}</span>` : ''}
        </a>
        <a href="notifications.html" class="nav-bell" title="Notifications">
          <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="nav-paw-icon">
            <defs>
              <linearGradient id="pawGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#f97316"/>
                <stop offset="50%" stop-color="#ec4899"/>
                <stop offset="100%" stop-color="#6366f1"/>
              </linearGradient>
            </defs>
            <!-- Top left toe -->
            <ellipse cx="28" cy="22" rx="11" ry="13" fill="url(#pawGrad)"/>
            <!-- Top right toe -->
            <ellipse cx="72" cy="22" rx="11" ry="13" fill="url(#pawGrad)"/>
            <!-- Middle left toe -->
            <ellipse cx="14" cy="42" rx="10" ry="12" fill="url(#pawGrad)"/>
            <!-- Middle right toe -->
            <ellipse cx="86" cy="42" rx="10" ry="12" fill="url(#pawGrad)"/>
            <!-- Main pad -->
            <path d="M50 35 C28 35 18 52 20 68 C22 82 34 88 50 88 C66 88 78 82 80 68 C82 52 72 35 50 35Z" fill="url(#pawGrad)"/>
          </svg>
          ${unread > 0 ? `<span class="nav-bell-badge">${unread > 9 ? '9+' : unread}</span>` : ''}
        </a>
        <a href="profile.html" class="nav-avatar-link" title="${this.currentUser.name}">
          <img src="${this.currentUser.avatar}" class="nav-avatar" alt="${this.currentUser.name}">
          <span class="nav-username">${this.currentUser.name.split(' ')[0]}</span>
        </a>
        <button class="btn-logout" id="logoutBtn">Sign out</button>
      `;
      document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
    } else {
      navRight.innerHTML = `
        <a href="login.html" class="btn-nav-login">Sign in</a>
        <a href="login.html#register" class="btn-nav-register">Join free</a>
      `;
    }
  }
};

export { Auth };
