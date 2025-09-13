// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = "1:927529779762:web:7645801aa4e99df407f22b";

// Gán biến cấu hình lên window để dùng toàn cục cho ClassroomApp
window.__firebase_config = JSON.stringify(firebaseConfig);
window.__app_id = appId;
window.__initial_auth_token = ""; // Nếu có token thì gán vào đây

// Export các biến cấu hình
export { firebaseConfig };