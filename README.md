[README.md](https://github.com/user-attachments/files/26522825/README.md)
# 🐾 Fur Nest

A social pet marketplace where users can adopt, buy, or give pets a new home — and build a dedicated social profile for each of their pets.

Live at: **[furnest.us](http://furnest.us)**

---

## What it does

Fur Nest combines a pet marketplace with a pet social network. Users can:

- Browse and list pets for adoption, sale, or free rehoming
- Create dedicated profiles for their own pets with photo galleries and memory journals
- Follow other users and see their posts in a social feed
- Like posts and receive notifications for follows, likes, and new posts
- Message pet owners directly about listings

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, Vanilla JavaScript (ES Modules) |
| Hosting | Netlify |
| Authentication | Firebase Auth (Email/Password) |
| Database | Cloud Firestore |
| Image uploads | Cloudinary |
| Avatars | DiceBear API |
| UI framework | Bootstrap 5.3 |

---

## Project structure

```
fur-nest/
├── index.html               # Feed page (home)
├── marketplace.html         # Pet listings / marketplace
├── add-pet.html             # Create or edit a marketplace listing
├── pet-details.html         # Individual pet listing page
├── profile.html             # User profile page
├── pet-profile.html         # Individual pet's social profile
├── create-pet-profile.html  # Create or edit a pet profile
├── login.html               # Sign in / register
├── notifications.html       # Notification centre
├── firestore.rules          # Firestore security rules
├── styles/
│   └── style.css            # Global stylesheet
└── js/
    ├── firebase.js          # Firebase initialisation and exports
    ├── auth.js              # Auth logic, session management, nav rendering
    ├── data.js              # Firestore helpers for pets and users
    ├── feed.js              # Feed posts, likes, follow/unfollow logic
    ├── notifications.js     # Notification read/write helpers
    ├── petProfile.js        # Pet profile and memory journal logic
    ├── app.js               # Marketplace homepage rendering
    ├── addPet.js            # Add/edit listing form logic
    ├── details.js           # Pet listing detail page logic
    ├── profile.js           # User profile page logic
    └── login.js             # Login and register form logic
```

---

## Features

### Marketplace
- List pets for adoption, sale, or free
- Upload photos via Cloudinary
- Search by name, breed, or location
- Filter by dogs or cats
- Mark listings as sold or adopted
- Edit or delete your own listings

### Social feed
- Post text and photos to your feed
- Following tab shows posts from people you follow
- Discover tab shows all posts
- Like posts
- Suggested users sidebar with follow/unfollow

### User profiles
- Animated avatar (DiceBear) or uploaded photo
- Following and followers counts with clickable lists
- Follow/unfollow other users
- Edit name, bio, location, and phone

### Pet profiles
- Dedicated profile page per pet
- Photo gallery
- Memory journal with text and photos
- Public or private visibility setting
- Separate from marketplace listings

### Notifications
- New follower alerts
- New post from someone you follow
- Post likes
- Paw icon in navbar with unread badge
- Mark individual or all as read

---

## Firestore collections

| Collection | Purpose |
|---|---|
| `users` | User accounts, following/followers arrays |
| `users/{id}/notifications` | Per-user notification subcollection |
| `pets` | Marketplace listings |
| `posts` | Feed posts |
| `petProfiles` | Pet social profiles |
| `petProfiles/{id}/memories` | Photos and journal entries per pet |

---

## Firestore indexes required

| Collection | Fields | Order |
|---|---|---|
| `pets` | `ownerId` ↑, `createdAt` ↓ | Collection |
| `petProfiles` | `ownerId` ↑, `createdAt` ↓ | Collection |
| `posts` | `ownerId` ↑, `createdAt` ↓ | Collection |

---

## Environment setup

No build step required. The project runs as static files.

1. Clone or download the project
2. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
3. Enable **Email/Password** authentication
4. Create a **Firestore** database
5. Replace the Firebase config in `js/firebase.js` with your own project config
6. Create a free [Cloudinary](https://cloudinary.com) account
7. Create an **unsigned** upload preset
8. Replace `CLOUDINARY_CLOUD` and `CLOUDINARY_PRESET` in `js/addPet.js` and `js/petProfile.js`
9. Deploy the folder to Netlify (drag and drop)
10. Add your domain to Firebase Auth authorized domains
11. Publish the Firestore security rules from `firestore.rules`
12. Create the three composite indexes listed above

---

## Security notes

- Firebase config is intentionally public — security is enforced by Firestore rules server-side
- Cloudinary upload preset should have **allowed origins** restricted to your domain
- Firebase API key should be restricted to your domain in Google Cloud Console
- All write operations require authentication
- Users can only edit or delete their own content

---

## Roadmap

- [ ] Messaging system between buyers and sellers
- [ ] Search filters by location and price range
- [ ] More pet types (birds, rabbits, fish)
- [ ] Featured listings on marketplace homepage
- [ ] iOS and Android apps via Capacitor
- [ ] Push notifications

---

## Author

Built by Abubaker Ahmadi  
[furnest.us](http://furnest.us)
