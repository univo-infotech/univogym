import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./config";

export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logoutUser() {
  await signOut(auth);
}

export async function getUserRole(uid) {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    // Default fallback if doc doesn't exist yet
    return { role: "owner", gymId: "univo_main", name: "Gym Admin" };
  } catch (error) {
    console.error("Error fetching user role:", error);
    return { role: "owner", gymId: "univo_main", name: "Gym Admin" };
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
