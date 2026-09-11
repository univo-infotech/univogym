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

export async function getServices(gymId) {
  const q = query(
    collection(db, "gyms", gymId, "services"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addService(gymId, data) {
  const ref = collection(db, "gyms", gymId, "services");
  const docRef = await addDoc(ref, {
    ...data,
    isActive: data.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateService(gymId, serviceId, data) {
  const ref = doc(db, "gyms", gymId, "services", serviceId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteService(gymId, serviceId) {
  const ref = doc(db, "gyms", gymId, "services", serviceId);
  await deleteDoc(ref);
}
