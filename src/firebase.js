// firebase-config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAp6BExNY8w2ZwLElXq2-m6xWgPucJ1oKA",
  authDomain: "vidyanxt-c5816.firebaseapp.com",
  projectId: "vidyanxt-c5816",
  storageBucket: "vidyanxt-c5816.firebasestorage.app",
  messagingSenderId: "400977849683",
  appId: "1:400977849683:web:06f06a8ec5bfb5faa005a6",
  measurementId: "G-QDX40PH6XW",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);
const db = getFirestore(app);

export { app, auth, functions, db };
