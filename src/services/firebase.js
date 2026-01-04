import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCZ7E1mJJiyDMvTwgQrjB4k52yyNwFvmTg",
  authDomain: "parody-party.firebaseapp.com",
  projectId: "parody-party",
  storageBucket: "parody-party.firebasestorage.app",
  messagingSenderId: "357791907404",
  appId: "1:357791907404:web:741eb25bdac7652a327ee9"
};

// Initialize Firebase with error handling
let app;
let db;
let auth;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  
  // Initialize Auth with AsyncStorage persistence for React Native
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
    console.log('Firebase initialized successfully with AsyncStorage persistence');
  } catch (authError) {
    // If auth is already initialized, get the existing instance
    if (authError.code === 'auth/already-initialized') {
      auth = getAuth(app);
      console.log('Firebase Auth already initialized, using existing instance');
    } else {
      // Fallback to default auth if initialization fails
      console.warn('Failed to initialize auth with persistence, using default:', authError);
      auth = getAuth(app);
    }
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Don't throw - allow app to continue (will fail gracefully when Firebase is used)
  console.error('Firebase failed to initialize, app may not work correctly');
}

export { db, auth };
export default app;

