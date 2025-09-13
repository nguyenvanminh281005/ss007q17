// Firebase configuration and exports
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDebDCp-FOJUp18S0F4mxUdnIk7zmbndXE",
  authDomain: "ss007q17.firebaseapp.com",
  projectId: "ss007q17",
  storageBucket: "ss007q17.firebasestorage.app",
  messagingSenderId: "927529779762",
  appId: "1:927529779762:web:7645801aa4e99df407f22b",
  measurementId: "G-XMCH3FP9PZ"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Export configuration for reference
export { firebaseConfig };
