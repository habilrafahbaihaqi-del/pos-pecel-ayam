import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// GANTI ISI OBJEK INI DENGAN MILIKMU DARI FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyBxP6Uv-eS5dhKkCrNauzxwChcVfeV7U94",
  authDomain: "pos-pecel-ayam.firebaseapp.com",
  projectId: "pos-pecel-ayam",
  storageBucket: "pos-pecel-ayam.firebasestorage.app",
  messagingSenderId: "940741730165",
  appId: "1:940741730165:web:53afc5b9f58edaacc67d3c",
};

// Inisialisasi Firebase (logika ini mencegah error inisialisasi ganda di ekosistem Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Export modul Autentikasi dan Database (Firestore) agar bisa dipakai di halaman lain
export const auth = getAuth(app);
export const db = getFirestore(app);
