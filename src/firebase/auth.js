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

export async function createStaffUser(email, password, role, gymId, name = "", profileId = "", permissions = {}, phone = "") {
  try {
    // Only owner exists in Firebase Auth. Staff/trainers/co-owners are stored in Firestore.
    const staffDocId = `staff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const cleanPhone = (phone || "").replace(/\D/g, "");
    const cleanEmail = (email || "").trim().toLowerCase();
    
    await setDoc(doc(db, "users", staffDocId), {
      email: cleanEmail,
      phone: cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone,
      password,
      role,
      gymId,
      name,
      profileId,
      permissions,
      status: "active",
      createdAt: new Date().toISOString()
    });

    // Update staff profile in gyms/{gymId}/staff/{profileId} if linked
    if (profileId && gymId) {
      try {
        const { updateDoc } = await import("firebase/firestore");
        const staffRef = doc(db, "gyms", gymId, "staff", profileId);
        await updateDoc(staffRef, {
          appUserId: staffDocId,
          hasAppAccess: true,
          appRole: role,
          ...(cleanEmail ? { email: cleanEmail } : {})
        });
      } catch (err) {
        console.warn("Notice updating staff profile link:", err.message);
      }
    }
    
    return { uid: staffDocId, email: cleanEmail, name };
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
  
  if (userUpdates.email) userUpdates.email = userUpdates.email.trim().toLowerCase();
  if (userUpdates.phone !== undefined) {
    const raw = (userUpdates.phone || "").replace(/\D/g, "");
    userUpdates.phone = raw.length >= 10 ? raw.slice(-10) : raw;
  }
  // If password was empty, don't overwrite with empty
  if (userUpdates.password === "" || userUpdates.password === undefined) {
    delete userUpdates.password;
  }
  
  await updateDoc(userRef, userUpdates);
  
  // Update staff profile if profileId exists
  if (profileId && gymId) {
    const staffRef = doc(db, 'gyms', gymId, 'staff', profileId);
    const staffUpdates = {
      hasAppAccess: data.status !== "inactive",
      appRole: data.role
    };
    if (data.name) staffUpdates.name = data.name;
    if (data.email) staffUpdates.email = data.email;
    if (data.status) staffUpdates.status = data.status;
    if (data.permissions) staffUpdates.permissions = data.permissions;
    
    await updateDoc(staffRef, staffUpdates).catch(e => console.log('Staff profile update skipped:', e.message));
  }
}

export async function revokeStaffLogin(uid, profileId, gymId) {
  const { doc, deleteDoc, updateDoc } = await import('firebase/firestore');
  
  // Remove user record from users collection (disables login immediately)
  if (uid) {
    await deleteDoc(doc(db, 'users', uid));
  }
  
  // Remove linked access state from staff profile without deleting staff records
  if (profileId && gymId) {
    const staffRef = doc(db, 'gyms', gymId, 'staff', profileId);
    await updateDoc(staffRef, {
      appUserId: null,
      hasAppAccess: false,
      appRole: null
    }).catch(e => console.log('Staff profile access revoke note:', e.message));
  }
}

export async function deleteStaffUser(uid, profileId, gymId) {
  const { doc, deleteDoc } = await import('firebase/firestore');
  
  // Delete from users collection (removes their access in app)
  if (uid) {
    await deleteDoc(doc(db, 'users', uid));
  }
  
  // Delete from staff collection if linked
  if (profileId && gymId) {
    await deleteDoc(doc(db, 'gyms', gymId, 'staff', profileId)).catch(e => console.log('Staff profile delete skipped:', e.message));
  }
}

