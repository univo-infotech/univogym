import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB8cqhVDzFlD4qHrqitQIP2A_dW_Mc_7wE",
  authDomain: "gym-mangement-df239.firebaseapp.com",
  projectId: "gym-mangement-df239",
  storageBucket: "gym-mangement-df239.firebasestorage.app",
  messagingSenderId: "733992687536",
  appId: "1:733992687536:web:fca8e22764b961b4ec2875",
  measurementId: "G-RFCDTMECX4",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
