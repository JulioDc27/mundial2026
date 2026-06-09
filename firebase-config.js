// firebase-config.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Tu objeto de configuración de Firebase (COPIA EL TUYO AQUÍ)
const firebaseConfig = {
  apiKey: "AIzaSyC0WeyW7UxG_m_Nt7GW2xSFPIBjOzZ_0Io",
  authDomain: "quiniela-mundial-202.firebaseapp.com",
  projectId: "quiniela-mundial-202",
  storageBucket: "quiniela-mundial-202.firebasestorage.app",
  messagingSenderId: "293885729460",
  appId: "1:293885729460:web:2ed08c3c1d1118c4c455e1"
};


// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore (nuestra base de datos)
const db = getFirestore(app);

export { db };