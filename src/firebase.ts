import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDcfMe9YUeeB_QlPuUJVepWRpNXT1QOU54",
    authDomain: "certificate-fa585.firebaseapp.com",
    projectId: "certificate-fa585",
    storageBucket: "certificate-fa585.firebasestorage.app",
    messagingSenderId: "522772028303",
    appId: "1:522772028303:web:94874b8835dc54d3d089fa"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
