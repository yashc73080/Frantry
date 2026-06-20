// TODO: [FIREBASE SETUP] Replace all placeholder values below with your actual Firebase config.
// Steps:
//   1. Go to https://console.firebase.google.com and create (or open) your project.
//   2. Click the "</>" (Web) icon to register a web app if you haven't already.
//   3. Copy the firebaseConfig object from the "SDK setup and configuration" step.
//   4. Paste each value into your Frantry/.env.local file (see .env.local.example).
//   5. In Firebase Console → Authentication → Sign-in method → enable Google provider.
//   6. In Firebase Console → Authentication → Settings → Authorized domains →
//      add your Vercel deployment URL (e.g. frantry.vercel.app) and localhost.

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Avoid re-initializing on hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
