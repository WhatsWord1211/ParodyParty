# Firebase Setup Guide for Parody Party

## Free Tier Limits (Spark Plan)

The free Firebase Spark plan includes:
- **Firestore**: 1 GB storage, 50K reads/day, 20K writes/day
- **Authentication**: Unlimited
- **Storage**: 5 GB storage, 1 GB/day downloads (for audio files)
- **Functions**: 2 million invocations/month (if you add Cloud Functions later)

**This is MORE than enough for development and testing!** You can always upgrade later if needed.

## Step-by-Step Setup

### 1. Create New Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `parody-party` (or whatever you prefer)
4. **Disable Google Analytics** (optional, not needed for prototype)
5. Click **"Create project"**
6. Wait for project to be created, then click **"Continue"**

### 2. Enable Firestore Database

1. In your Firebase project, click **"Firestore Database"** in the left menu
2. Click **"Create database"**
3. Select **"Start in test mode"** (we'll add rules next)
4. Choose a location (pick closest to you)
5. Click **"Enable"**

### 3. Set Up Firestore Security Rules

1. Still in Firestore, click the **"Rules"** tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /games/{gameId} {
      // Anyone can read game data (needed for real-time sync)
      allow read: if true;
      
      // Only authenticated users can write
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if false; // Prevent accidental deletions
    }
  }
}
```

3. Click **"Publish"**

### 4. Enable Anonymous Authentication

1. Click **"Authentication"** in the left menu
2. Click **"Get started"** (if first time)
3. Click the **"Sign-in method"** tab
4. Find **"Anonymous"** in the list
5. Click on it, toggle **"Enable"** to ON
6. Click **"Save"**

### 5. Get Your Firebase Config

1. Click the **gear icon** ⚙️ next to "Project Overview"
2. Click **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **Web icon** `</>` (even though it's a mobile app, we use web config)
5. Register app:
   - App nickname: `Parody Party` (optional)
   - **Do NOT check** "Also set up Firebase Hosting"
   - Click **"Register app"**
6. Copy the `firebaseConfig` object that appears

It will look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "parody-party-xxxxx.firebaseapp.com",
  projectId: "parody-party-xxxxx",
  storageBucket: "parody-party-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 6. Add Config to Your App

1. Open `src/services/firebase.js` in your ParodyParty project
2. Replace the placeholder config with your actual config from step 5
3. Save the file

### 7. (Optional) Set Up Firebase Storage for Audio Files

If you want to host audio files in Firebase:

1. Click **"Storage"** in the left menu
2. Click **"Get started"**
3. Start in **"test mode"** (we can secure it later)
4. Choose a location (same as Firestore is fine)
5. Click **"Done"**

You can upload audio files here later and get download URLs to use in your game data.

## Testing Your Setup

After completing the above steps:

1. Run `npm install` in your ParodyParty directory
2. Run `npm start`
3. Try creating a game - if it works, Firebase is connected!

## Troubleshooting

**"Permission denied" errors:**
- Check that Firestore rules are published
- Make sure Anonymous Auth is enabled

**"App not initialized" errors:**
- Double-check your config in `firebase.js`
- Make sure all fields are filled in correctly

**Can't create games:**
- Verify Anonymous Auth is enabled
- Check browser console for specific error messages

## Next Steps

Once Firebase is set up:
1. Add song prompts to `src/utils/gameData.js`
2. Add audio files (host them or use Firebase Storage)
3. Test the game flow with multiple devices/emulators

## Cost Monitoring

Firebase free tier is generous, but you can monitor usage:
- Go to Firebase Console > Usage and billing
- Set up budget alerts if you want (optional)

For a prototype with a few testers, you'll stay well within free limits!


