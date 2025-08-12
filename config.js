// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAsCG4JbDAg9qsMgQMhqrCOeROqWIXYa94",
  authDomain: "fin-copilot-cd3b5.firebaseapp.com",
  projectId: "fin-copilot-cd3b5",
  storageBucket: "fin-copilot-cd3b5.firebasestorage.app",
  messagingSenderId: "556852222964",
  appId: "1:556852222964:web:281947e07e0f03bcfdf7a1",
  measurementId: "G-4HD7WGCLC9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
