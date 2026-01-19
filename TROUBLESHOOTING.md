# Troubleshooting Blue Screen Error

## How to See Error Logs

1. **In your terminal where `npm start` is running:**
   - Look for red error messages
   - Scroll up to see the full error stack trace

2. **In Expo Go app:**
   - Shake your device (or press `Cmd+D` on iOS simulator / `Cmd+M` on Android)
   - Select "Debug Remote JS"
   - Open Chrome DevTools (should open automatically)
   - Check the Console tab for errors

3. **Check Metro bundler output:**
   - The terminal running `npm start` shows compilation errors
   - Look for red text or "Failed to compile" messages

## Common Issues

### Firebase Not Initialized
- Check that `src/services/firebase.js` has your correct Firebase config
- Make sure Firestore and Anonymous Auth are enabled in Firebase Console

### Import Errors
- Check that all file paths are correct
- Make sure all dependencies are installed (`npm install`)

### Version Compatibility
- Expo SDK 50 requires compatible package versions
- If you see module not found errors, check package versions

## Next Steps

After you see the actual error message, we can fix it. The error boundary I added should now show the error on screen instead of just a blue screen.



