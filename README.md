# Parody Party

A multiplayer music fill-in-the-blank game built as a website.

## Overview

Parody Party is a game where players listen to music clips and fill in the blank lyrics. Players vote on each other's answers, and the player with the most points wins!

## Features

- 🎵 Music-based prompts with fill-in-the-blank lyrics
- 👥 Multiplayer support (2+ players)
- 🔥 Real-time synchronization via Firebase
- 🌐 Browser-based, device-friendly
- 🎮 Simple lobby system with 4-letter game codes
- 🔗 QR join links for quick access

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
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

### 5. Run the Website

```bash
npm run dev
```

Then open the local URL shown in the terminal.

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
│   │   └── gameService.js
│   ├── utils/            # Utilities and game data
│   │   └── gameData.js
│   └── components/       # Reusable components
├── assets/               # Images, sounds, etc.
├── index.html            # Vite HTML entry
├── vite.config.js        # Vite configuration
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
- Prompts are text-only; no audio is required.
- Game state is managed entirely in Firestore for real-time sync
- All players see the same game state, UI adapts based on player role

## Next Steps

- [ ] Add actual song prompts and audio files
- [ ] Add persistence/reconnect handling
- [ ] Add animations and polish
- [ ] Implement reconnection handling
- [ ] Add sound effects
- [ ] Create admin panel for adding songs
- [ ] Add difficulty levels
- [ ] Implement player stats/history

## License

Private project



