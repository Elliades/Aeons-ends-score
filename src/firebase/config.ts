import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';

// Firebase configuration
// TODO: Replace with your Firebase project configuration
// You can find this in Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'your-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://your-project-default-rtdb.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'your-app-id',
};

let app: FirebaseApp | null = null;
let database: Database | null = null;

/**
 * Check if Firebase is properly configured
 */
export function isFirebaseConfigured(): boolean {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey;
  const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL || firebaseConfig.databaseURL;
  
  // Check if we're using placeholder values
  return apiKey !== 'your-api-key' && databaseURL !== 'https://your-project-default-rtdb.firebaseio.com';
}

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    if (!isFirebaseConfigured()) {
      console.warn('Firebase is not configured. Please set up Firebase credentials in .env file. See MULTIPLAYER_SETUP.md for instructions.');
    }
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseDatabase(): Database {
  if (!database) {
    const app = getFirebaseApp();
    database = getDatabase(app);
  }
  return database;
}

