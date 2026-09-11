import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "./config";

export async function addStockItem(gymId, itemData) {
  const colRef = collection(db, `gyms/${gymId}/stock`);
  return await addDoc(colRef, {
    ...itemData,
    createdAt: new Date().toISOString()
  });
}

export async function updateStockItem(gymId, itemId, data) {
  const docRef = doc(db, `gyms/${gymId}/stock`, itemId);
  return await updateDoc(docRef, data);
}

export async function deleteStockItem(gymId, itemId) {
  const docRef = doc(db, `gyms/${gymId}/stock`, itemId);
  return await deleteDoc(docRef);
}

export async function getStock(gymId) {
  const colRef = collection(db, `gyms/${gymId}/stock`);
  const snap = await getDocs(colRef);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function logServiceDone(gymId, itemId) {
  const docRef = doc(db, `gyms/${gymId}/stock`, itemId);
  return await updateDoc(docRef, {
    lastServiceDate: new Date().toISOString().split("T")[0]
  });
}
