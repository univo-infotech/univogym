import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword, 
  updateProfile,
  getAuth as getSecondaryAuth
} from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { doc, getDoc, setDoc } from "firebase/firestore";
import app, { auth, db } from "./config";

export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential;
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
    return { role: "owner" };
  } catch (error) {
    console.error("Error fetching user role:", error);
    return { role: "owner" };
  }
}

export async function createStaffUser(email, password, role, gymId, name = "", profileId = "", permissions = []) {
  try {
    const secondaryApp = initializeApp(app.options, "SecondaryApp_" + Date.now());
    const secondaryAuth = getSecondaryAuth(secondaryApp);
    
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    if (name) {
      await updateProfile(cred.user, { displayName: name });
    }
    
    // Assign role in main db
    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      role,
      gymId,
      name,
      profileId,
      permissions,
      createdAt: new Date().toISOString()
    });
    
    await secondaryAuth.signOut();
    await deleteApp(secondaryApp);
    
    return cred.user;
  } catch (error) {
    console.error("Error creating staff/trainer user:", error);
    throw error;
  }
}
