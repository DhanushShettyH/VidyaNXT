import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "dummy-api",        // You can use dummy values for local dev
  authDomain: "localhost",
  projectId: "vidyanxt-c5816",     // Change if needed
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth emulator setup
const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099");

// Functions emulator setup
const functions = getFunctions(app); // ✅ Emulator default
connectFunctionsEmulator(functions, "127.0.0.1", 5001);

export { app, auth, functions };
