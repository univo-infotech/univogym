import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./config";

export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  // Return userCredential object with user inside
  return userCredential;
}

export async function logoutUser() {
  await signOut(auth);
}

export async function getUserRole(uid) {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return data.role || "owner";
    }
    // Default to owner for univo@gmail.com or newly created admin accounts
    return "owner";
  } catch (error) {
    console.error("Error fetching user role:", error);
    return "owner";
  }
}

export async function createStaffUser(email, password, role, gymId, name = "") {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    await updateProfile(cred.user, { displayName: name });
  }
  await setDoc(doc(db, "users", cred.user.uid), {
    email,
    role,
    gymId,
    name,
    createdAt: new Date().toISOString()
  });
  return cred.user;
}
