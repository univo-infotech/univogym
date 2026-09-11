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

export async function getPlans(gymId) {
  const q = query(
    collection(db, "gyms", gymId, "plans"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addPlan(gymId, data) {
  const ref = collection(db, "gyms", gymId, "plans");
  const docRef = await addDoc(ref, {
    ...data,
    memberCount: 0,
    isActive: data.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updatePlan(gymId, planId, data) {
  const ref = doc(db, "gyms", gymId, "plans", planId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deletePlan(gymId, planId) {
  const ref = doc(db, "gyms", gymId, "plans", planId);
  await deleteDoc(ref);
}

export async function getActivePlans(gymId) {
  try {
    const all = await getPlans(gymId);
    return all.filter((p) => p.isActive !== false);
  } catch (err) {
    console.error("getActivePlans error:", err);
    return [];
  }
}
