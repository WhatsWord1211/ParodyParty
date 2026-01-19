import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCZ7E1mJJiyDMvTwgQrjB4k52yyNwFvmTg',
  authDomain: 'parody-party.firebaseapp.com',
  projectId: 'parody-party',
  storageBucket: 'parody-party.firebasestorage.app',
  messagingSenderId: '357791907404',
  appId: '1:357791907404:web:741eb25bdac7652a327ee9'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('Failed to set auth persistence:', error);
});

export { db, auth };
export default app;

