import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

export async function getStaff(gymId) {
  const q = query(
    collection(db, "gyms", gymId, "staff"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addStaff(gymId, data) {
  const ref = collection(db, "gyms", gymId, "staff");
  const docRef = await addDoc(ref, {
    ...data,
    isActive: data.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateStaff(gymId, staffId, data) {
  const ref = doc(db, "gyms", gymId, "staff", staffId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteStaff(gymId, staffId) {
  const ref = doc(db, "gyms", gymId, "staff", staffId);
  await deleteDoc(ref);
}
