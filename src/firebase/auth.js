import { 
  signInWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./config";

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
    // Only owner exists in Firebase Auth. Staff/trainers/co-owners are stored in Firestore.
    const staffDocId = `staff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    await setDoc(doc(db, "users", staffDocId), {
      email,
      password,
      role,
      gymId,
      name,
      profileId,
      permissions,
      status: "active",
      createdAt: new Date().toISOString()
    });
    
    return { uid: staffDocId, email, name };
  } catch (error) {
    console.error("Error creating staff record:", error);
    throw error;
  }
}

export async function getStaffUsers(gymId) {
  const { collection, query, where, getDocs } = await import("firebase/firestore");
  const q = query(collection(db, "users"), where("gymId", "==", gymId));
  const snap = await getDocs(q);
  // Return users who have staff, receptionist, manager, co-owner, or partner roles (excluding members/trainers)
  return snap.docs
    .map(doc => ({ uid: doc.id, ...doc.data() }))
    .filter(u => u.role !== 'member' && u.role !== 'trainer');
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
