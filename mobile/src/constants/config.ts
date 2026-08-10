/**
 * 🔒 Security Architecture Note:
 *
 * 1. Public Configuration vs Secrets:
 *    - Public Config: The values defined in this file (Firebase apiKey, authDomain, API URLs, etc.)
 *      are PUBLIC configurations. They are bundled inside the client application binary (JS bundle)
 *      and shipped to client devices. Thus, they are visible to anyone decompiling the app or inspecting traffic.
 *      Exposing these public configurations is standard and safe for client-side SDKs (e.g. Firebase Auth).
 *    - Secrets: Secret keys (private service account credentials, database passwords, API private keys)
 *      MUST NEVER be stored in the mobile codebase. They belong strictly on the backend.
 *
 * 2. Environment Variables:
 *    - Values are loaded from `process.env.EXPO_PUBLIC_*` using Expo environment configuration.
 *    - Hardcoded defaults represent secure production fallbacks.
 */

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://graceful-playfulness-production.up.railway.app/api';

const Config = {
  API_BASE_URL,
  
  EXPO_PROJECT_ID: process.env.EXPO_PUBLIC_PROJECT_ID || '242e7c6a-8b3c-4113-b78b-09d385d0a34f',
  
  FIREBASE: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDSZYTXmvclmiyQ3rCxPAh1e_EToXycFbQ',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'hcm202-2d75e.firebaseapp.com',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'hcm202-2d75e',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'hcm202-2d75e.firebasestorage.app',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '837187985882',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:837187985882:web:a2012ea4bbf3b3003660e3',
    webClientId: process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID || '837187985882-fhc4m8i1pjljd50le64p8q4nps03h942.apps.googleusercontent.com', 
  },
  
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 50,
  },
  PLATFORM_FEE_RATE: 0.1,
  MATCHING_WEIGHTS: {
    PRICE: 0.30,
    RATING: 0.25,
    DISTANCE: 0.20,
    COMPLETION_RATE: 0.15,
    RESPONSE_TIME: 0.10,
  },
  DEBUG_LOGIN: process.env.EXPO_PUBLIC_DEBUG_LOGIN === 'true' || false,
};

export default Config;