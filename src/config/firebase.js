import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase Web App configuration previously shared for Techtroopers.
// Firebase client configuration is intentionally visible in browser apps;
// protect data with Authentication + Firestore/Storage Security Rules.
export const firebaseConfig = {
  apiKey: 'AIzaSyDoO4XVTBtYfbaYoGif0fyApKbva8FR9l0',
  authDomain: 'universal-9b6da.firebaseapp.com',
  projectId: 'universal-9b6da',
  storageBucket: 'universal-9b6da.firebasestorage.app',
  messagingSenderId: '390477196646',
  appId: '1:390477196646:web:69a435fd7506dd27c8aca7',
};

export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
