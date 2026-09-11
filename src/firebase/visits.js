import { collection, addDoc, updateDoc, doc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "./config";

export async function addVisit(gymId, visitData) {
  const colRef = collection(db, `gyms/${gymId}/visits`);
  return await addDoc(colRef, {
    ...visitData,
    createdAt: new Date().toISOString()
  });
}

export async function updateVisit(gymId, visitId, data) {
  const docRef = doc(db, `gyms/${gymId}/visits`, visitId);
  return await updateDoc(docRef, data);
}

export async function getVisits(gymId) {
  const colRef = collection(db, `gyms/${gymId}/visits`);
  const q = query(colRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
