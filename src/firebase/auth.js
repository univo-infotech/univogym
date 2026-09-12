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

export async function getStaffUsers(gymId) {
  const { collection, query, where, getDocs } = await import("firebase/firestore");
  const q = query(collection(db, "users"), where("gymId", "==", gymId), where("role", "in", ["staff", "receptionist", "manager"]));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
}

export async function updateStaffUser(uid, profileId, gymId, data) {
  const { doc, updateDoc } = await import('firebase/firestore');
  
  // Update users collection
  const userRef = doc(db, 'users', uid);
  const userUpdates = { ...data };
  delete userUpdates.phone; // user doc doesn't typically store phone, but let's just keep it clean
  await updateDoc(userRef, userUpdates);
  
  // Update staff profile if profileId exists
  if (profileId) {
    const staffRef = doc(db, 'gyms', gymId, 'staff', profileId);
    await updateDoc(staffRef, {
      name: data.name,
      status: data.status,
      permissions: data.permissions
    }).catch(e => console.log('Staff profile update skipped:', e.message));
  }
}

export async function deleteStaffUser(uid, profileId, gymId) {
  const { doc, deleteDoc } = await import('firebase/firestore');
  
  // Delete from users collection (removes their access in app)
  await deleteDoc(doc(db, 'users', uid));
  
  // Delete from staff collection if linked
  if (profileId) {
    await deleteDoc(doc(db, 'gyms', gymId, 'staff', profileId)).catch(e => console.log('Staff profile delete skipped:', e.message));
  }
}
