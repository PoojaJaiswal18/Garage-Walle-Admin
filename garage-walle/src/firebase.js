// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCeLp084czdVJRoNec2n0KUS-65GpJrbwU",
  authDomain: "garage-walle-admin.firebaseapp.com",
  projectId: "garage-walle-admin",
  storageBucket: "garage-walle-admin.appspot.com",
  messagingSenderId: "1074551888831",
  appId: "1:1074551888831:web:f1be9585ab176bb9895f0a",
  measurementId: "G-XT6XP5612Y"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

const storage = getStorage(app); 

export { db, storage };