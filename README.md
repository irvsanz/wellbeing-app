# 🌿 Wellbeing App

A personal wellbeing assistant for daily habit tracking, mood logging, sleep tracking, and workout logging — with Firebase auth and cloud sync.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Add your Firebase config
Open `src/App.jsx` and replace the `FIREBASE_CONFIG` placeholder values (around line 30) with your Firebase project config.

### 3. Run locally
```bash
npm run dev
```

### 4. Deploy to Vercel
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Vercel auto-detects Vite — just click Deploy

## Firebase Setup
1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication > Email/Password**
3. Create a **Firestore Database**
4. Set Firestore rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
