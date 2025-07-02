// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"; // ← import Firestore

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);

// — AUTH EMULATOR —
const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099");

// — FUNCTIONS EMULATOR —
const functions = getFunctions(app);
connectFunctionsEmulator(functions, "127.0.0.1", 5001);

// — FIRESTORE EMULATOR —   ← NEW
const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8080); // default Firestore emulator port

export { app, auth, functions, db };
