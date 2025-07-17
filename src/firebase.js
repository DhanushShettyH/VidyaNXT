// firebase-config.js
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// production firebaseConfig
// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_APIKEY,
//   authDomain: import.meta.env.VITE_AUTHDOMAIN,
//   projectId: import.meta.env.VITE_PROJECTID,
//   storageBucket: import.meta.env.VITE_STORAGEBUCKET,
//   messagingSenderId: import.meta.env.VITE_MESSAGESENDERID,
//   appId: import.meta.env.VITE_APPID,
//   measurementId: import.meta.env.VITE_MEASUREMENTID,
// };
// const firebaseConfig = {
//   apiKey: "AIzaSyAp6BExNY8w2ZwLElXq2-m6xWgPucJ1oKA",
//   authDomain: "vidyanxt-c5816.firebaseapp.com",
//   projectId: "vidyanxt-c5816",
//   storageBucket: "vidyanxt-c5816.firebasestorage.app",
//   messagingSenderId: "400977849683",
//   appId: "1:400977849683:web:d74cae4e89b76ddba005a6",
//   measurementId: "G-Z0N8TDQYVE",
// };

// development firebaseConfig
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const functions = getFunctions(app);
const db = getFirestore(app);

// Connect to emulators only in development and only once
if (import.meta.env.VITE_DEV) {
  connectAuthEmulator(auth, "http://localhost:9099");
  connectFunctionsEmulator(functions, "localhost", 5001);
  connectFirestoreEmulator(db, "localhost", 8080);
}

export { app, auth, functions, db };
