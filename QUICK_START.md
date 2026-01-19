# Quick Start - Parody Party Website

## Prerequisites

- Node.js installed
- Firebase project with Firestore + Anonymous Auth enabled

## Step 1: Navigate to Project

```bash
cd ../ParodyParty
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Start the Website

```bash
npm run dev
```

Open the local URL shown in the terminal on any device.

## Step 4: Test the Game Flow

1. **Create a game** on one device
   - Enter your name
   - Click "Create Game"
   - Share the 4-letter code or QR join link

2. **Join the game** on another device
   - Enter your name
   - Enter the 4-letter game code (or scan the QR)

3. **Start the game** (as host)
   - Click "Start Game" in the lobby

4. **Play the round**
   - See the prompt
   - Fill in the blank
   - Submit your answer

5. **Vote on answers**
   - See all submissions
   - Vote 1-3 points on each

## Troubleshooting

### "Firebase not initialized"
- Check that you've updated `src/services/firebase.js` with your Firebase config
- Make sure Firestore and Anonymous Auth are enabled

### "Permission denied" errors
- Check Firestore security rules (see FIREBASE_SETUP.md)
- Make sure Anonymous Authentication is enabled

### QR scanner not working
- Ensure browser camera permissions are enabled
- Try HTTPS when testing on phones (or use local network + browser flags)

## Commands Reference

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally



