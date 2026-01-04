# Parody Party

A multiplayer music fill-in-the-blank game built with React Native and Expo.

## Overview

Parody Party is a game where players listen to music clips and fill in the blank lyrics. Players vote on each other's answers, and the player with the most points wins!

## Features

- 🎵 Music-based prompts with fill-in-the-blank lyrics
- 👥 Multiplayer support (2+ players)
- 🔥 Real-time synchronization via Firebase
- 📱 Cross-platform (iOS & Android)
- 🎮 Simple lobby system with game codes

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Firebase account and project

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Enable Anonymous Authentication
4. Copy your Firebase config from Project Settings > General > Your apps
5. Update `src/services/firebase.js` with your Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Set Up Firestore Rules

In Firebase Console > Firestore Database > Rules, add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /games/{gameId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 4. Add Game Data

Edit `src/utils/gameData.js` to add your song prompts with:
- Song title and artist
- Lyrics with blank positions
- Audio file URIs (hosted or local)

### 5. Run the App

```bash
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

## Project Structure

```
ParodyParty/
├── src/
│   ├── screens/          # Screen components
│   │   ├── HomeScreen.js
│   │   ├── LobbyScreen.js
│   │   ├── GameScreen.js
│   │   └── ResultsScreen.js
│   ├── services/         # Firebase and game logic
│   │   ├── firebase.js
│   │   ├── gameService.js
│   │   └── audioService.js
│   ├── utils/            # Utilities and game data
│   │   └── gameData.js
│   └── components/       # Reusable components (add as needed)
├── assets/               # Images, sounds, etc.
├── App.js               # Main app entry point
├── app.json             # Expo configuration
└── package.json
```

## Game Flow

1. **Home Screen**: Create or join a game with a code
2. **Lobby**: Wait for players, host starts the game
3. **Game Screen**: 
   - Listen to music clip
   - See lyrics with blank
   - Submit your answer
4. **Results Screen**: 
   - See all answers
   - Vote on answers (1-3 points)
   - View scores
5. **Next Round**: Repeat until max rounds reached

## Development Notes

- This is a **prototype** - focus on core functionality first
- Audio files should be hosted (Firebase Storage, CDN, etc.) or included in assets
- Game state is managed entirely in Firestore for real-time sync
- All players see the same game state, UI adapts based on player role

## Next Steps

- [ ] Add actual song prompts and audio files
- [ ] Implement timer functionality
- [ ] Add animations and polish
- [ ] Implement reconnection handling
- [ ] Add sound effects
- [ ] Create admin panel for adding songs
- [ ] Add difficulty levels
- [ ] Implement player stats/history

## License

Private project


