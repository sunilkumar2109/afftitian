// Import the functions you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAQ31UbAVmxrleGEZzcCXiJ2jp1iXzwpF0",
  authDomain: "affiliates-851d4.firebaseapp.com",
  projectId: "affiliates-851d4",
  storageBucket: "affiliates-851d4.firebasestorage.app",
  messagingSenderId: "682420715572",
  appId: "1:682420715572:web:fce85a7fc9c3260cb48a61",
  measurementId: "G-930FZJB07E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const db = getFirestore(app);
export const auth = getAuth(app);
