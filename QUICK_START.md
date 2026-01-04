# Quick Start - Testing Parody Party

## Prerequisites

- Node.js installed (you should already have this from WhatWord)
- Expo Go app on your phone (iOS or Android)
- OR Android/iOS emulator/simulator

## Step 1: Navigate to Project

```bash
cd ../ParodyParty
```

## Step 2: Install Dependencies

```bash
npm install
```

This will install all the packages from `package.json` (React Native, Expo, Firebase, etc.)

## Step 3: Start Expo

```bash
npm start
```

This will:
- Start the Expo development server
- Show a QR code in your terminal
- Open Expo DevTools in your browser

## Step 4: Connect Your Device

### Option A: Expo Go App (Easiest)

1. **Install Expo Go** on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Scan the QR code**:
   - iOS: Use Camera app (it will prompt to open in Expo Go)
   - Android: Use Expo Go app's built-in scanner

3. The app will load on your phone!

### Option B: Emulator/Simulator

- **iOS Simulator** (Mac only): Press `i` in the terminal
- **Android Emulator**: Press `a` in the terminal (requires Android Studio/emulator running)

## Step 5: Test the Game Flow

1. **Create a game** on one device
   - Enter your name
   - Click "Create Game"
   - Note the game code

2. **Join the game** on another device (or browser)
   - Enter your name
   - Enter the game code
   - Click "Join Game"

3. **Start the game** (as host)
   - Click "Start Game" in the lobby

4. **Play the round**
   - See the prompt (text only for now)
   - Fill in the blank
   - Submit your answer

5. **Vote on answers**
   - See all submissions
   - Vote 1-3 points on each

## Troubleshooting

### "Cannot connect to Expo"
- Make sure your phone and computer are on the same WiFi network
- Try "Tunnel" mode: Press `s` in Expo terminal, then `t` for tunnel

### "Firebase not initialized"
- Check that you've updated `src/services/firebase.js` with your Firebase config
- Make sure Firestore and Anonymous Auth are enabled in Firebase Console

### "Permission denied" errors
- Check Firestore security rules (see FIREBASE_SETUP.md)
- Make sure Anonymous Authentication is enabled

### App crashes on start
- Check the terminal for error messages
- Make sure all dependencies installed correctly (`npm install`)
- Try clearing cache: `npx expo start -c`

## Testing Multiplayer

To test with multiple devices:
1. Use Expo Go on 2+ phones
2. OR use one phone + one emulator
3. OR use one phone + web browser (press `w` in Expo terminal)

## Next Steps After Testing

Once basic flow works:
- Add song prompts to `src/utils/gameData.js`
- Test with real prompts
- Add music later when ready

## Commands Reference

- `npm start` - Start Expo dev server
- `npm start -- --clear` - Clear cache and start
- Press `r` - Reload app
- Press `m` - Toggle menu
- Press `j` - Open debugger
- Press `i` - Open iOS simulator
- Press `a` - Open Android emulator
- Press `w` - Open in web browser


