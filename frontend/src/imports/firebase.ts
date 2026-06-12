import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let auth: any = null;
let googleProvider: any = null;

if (hasFirebaseConfig) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    console.log('✅ Firebase initialized');
  } catch (err) {
    console.warn('⚠️ Firebase initialization failed:', err);
  }
} else {
  console.warn('⚠️ Firebase config missing (VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID). Firebase auth disabled.');
}

export { auth, googleProvider };