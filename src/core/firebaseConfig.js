// src/core/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {

  apiKey: "AIzaSyBjoWntpkZLsgH4gD5IqP0jzdqThPXSqK4",
  authDomain: "despliegues-bada-appbe.firebaseapp.com",
  projectId: "despliegues-bada-appbe",
  storageBucket: "despliegues-bada-appbe.firebasestorage.app",
  messagingSenderId: "77032755082",
  appId: "1:77032755082:web:6496965232198670238273",
  measurementId: "G-6BLQ2NWS48"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
// Exporta la instancia de Firestore
export const db = getFirestore(app);