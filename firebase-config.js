// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// ========== REEMPLAZA ESTOS VALORES CON LOS TUYOS ==========
const firebaseConfig = {
  apiKey: "AIzaSyC2umZTNt5G1sq1MjCPVVKQVOTmUWabCls",
  authDomain: "mundial-2026-1fad6.firebaseapp.com",
  projectId: "mundial-2026-1fad6",
  storageBucket: "mundial-2026-1fad6.firebasestorage.app",
  messagingSenderId: "1080511884765",
  appId: "1:1080511884765:web:b1aeaf18de99092df59a34"
};

// ===========================================================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };