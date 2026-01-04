# Audio Storage Options for Parody Party

## Overview

Your `audioService.js` already supports both local files and remote URLs, so you can use any of these approaches. Here are the options ranked by ease of setup:

---

## Option 1: Local Assets (Bundled with App) ⭐ **RECOMMENDED FOR PROTOTYPE**

**How it works:**
- Audio files live in `assets/sounds/` folder
- Bundled with the app when you build
- No internet required to play
- No hosting costs

**Pros:**
- ✅ Simplest setup - just add files to folder
- ✅ No hosting/bandwidth costs
- ✅ Works offline
- ✅ Fast loading (no network delay)
- ✅ No Firebase Storage setup needed

**Cons:**
- ❌ Increases app download size (each song ~1-3 MB)
- ❌ Can't update songs without app update
- ❌ Limited by app store size limits (usually 100-150 MB)

**Setup:**
1. Add MP3 files to `assets/sounds/` folder
2. Reference them like this in `gameData.js`:
```javascript
audioUri: require('../assets/sounds/song1.mp3')
```

**Best for:** Prototype, small song library (<20 songs), offline play

---

## Option 2: Firebase Storage

**How it works:**
- Upload audio files to Firebase Storage
- Get download URLs
- Store URLs in Firestore or gameData.js

**Pros:**
- ✅ Can update songs without app update
- ✅ Doesn't increase app size
- ✅ Free tier: 5 GB storage, 1 GB/day downloads
- ✅ Integrated with your Firebase project

**Cons:**
- ❌ Requires internet connection
- ❌ Bandwidth costs after free tier (1 GB/day free)
- ❌ Slight delay on first play (download)
- ❌ Need to manage uploads

**Setup:**
1. Enable Firebase Storage in console
2. Upload files via console or code
3. Get download URLs
4. Use URLs in `gameData.js`:
```javascript
audioUri: 'https://firebasestorage.googleapis.com/...'
```

**Best for:** Larger song library, frequent updates, production app

---

## Option 3: Free CDN Services

**Services:**
- **Cloudinary** (free tier: 25 GB storage, 25 GB/month bandwidth)
- **Imgur** (unlimited, but not designed for audio)
- **GitHub Releases** (free, but not ideal for this)
- **SoundCloud API** (requires API key, licensing issues)

**Pros:**
- ✅ Generous free tiers
- ✅ Fast CDN delivery
- ✅ Can update without app update
- ✅ Doesn't increase app size

**Cons:**
- ❌ Another service to manage
- ❌ May have usage limits
- ❌ Some require accounts/setup

**Best for:** If you want to avoid Firebase Storage costs

---

## Option 4: Self-Hosted (Your Own Server/CDN)

**How it works:**
- Host audio files on your own server or CDN
- Use direct URLs

**Pros:**
- ✅ Full control
- ✅ No per-file limits
- ✅ Can use any hosting (AWS S3, DigitalOcean, etc.)

**Cons:**
- ❌ Requires hosting setup
- ❌ Bandwidth costs
- ❌ More complex

**Best for:** If you already have hosting infrastructure

---

## Option 5: Streaming Service APIs (Advanced)

**Services:**
- Spotify Web API
- YouTube API
- Apple Music API

**Pros:**
- ✅ Huge library
- ✅ No storage needed

**Cons:**
- ❌ Complex licensing requirements
- ❌ API keys and authentication
- ❌ May not allow downloading/clips
- ❌ Legal issues with game use
- ❌ Rate limits

**Best for:** Not recommended for this use case

---

## My Recommendation

### For Prototype/Development:
**Start with Local Assets (Option 1)**

Why:
- Simplest to set up
- No additional services
- Works immediately
- Easy to test

### For Production:
**Hybrid Approach:**
- Keep popular/default songs as local assets (fast, offline)
- Use Firebase Storage for additional song packs (updatable)

---

## Implementation Examples

### Local Assets Example:
```javascript
// In gameData.js
import song1Audio from '../../assets/sounds/song1.mp3';
import song2Audio from '../../assets/sounds/song2.mp3';

export const songPrompts = [
  {
    songId: '1',
    title: 'Song Title',
    artist: 'Artist Name',
    lyrics: [...],
    blankPosition: 2,
    audioUri: song1Audio, // Local require
    difficulty: 'easy'
  }
];
```

### Firebase Storage Example:
```javascript
// In gameData.js
export const songPrompts = [
  {
    songId: '1',
    title: 'Song Title',
    artist: 'Artist Name',
    lyrics: [...],
    blankPosition: 2,
    audioUri: 'https://firebasestorage.googleapis.com/v0/b/parody-party.appspot.com/o/songs%2Fsong1.mp3?alt=media&token=...',
    difficulty: 'easy'
  }
];
```

### Mixed Approach:
```javascript
// Load from Firestore for dynamic songs
// Fall back to local assets for default songs
```

---

## File Size Considerations

- **MP3 at 128 kbps**: ~1 MB per minute
- **MP3 at 64 kbps**: ~0.5 MB per minute (good for voice/music clips)
- **Typical game clip**: 10-30 seconds = 0.1-0.5 MB

**App size limits:**
- iOS: 100 MB over cellular, unlimited on WiFi
- Android: 150 MB APK, larger with expansion files

**Recommendation:** Use 64-96 kbps MP3 for clips to keep sizes small.

---

## Quick Start: Local Assets

1. Create `assets/sounds/` folder (already exists)
2. Add your MP3 files there
3. Update `gameData.js` to use `require()` paths
4. That's it!

The audioService already handles both local and remote URIs automatically.


