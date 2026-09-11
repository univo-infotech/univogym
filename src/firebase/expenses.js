import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "./config";

export async function addExpense(gymId, expenseData) {
  const colRef = collection(db, `gyms/${gymId}/expenses`);
  return await addDoc(colRef, {
    ...expenseData,
    createdAt: new Date().toISOString()
  });
}

export async function updateExpense(gymId, expenseId, data) {
  const docRef = doc(db, `gyms/${gymId}/expenses`, expenseId);
  return await updateDoc(docRef, data);
}

export async function deleteExpense(gymId, expenseId) {
  const docRef = doc(db, `gyms/${gymId}/expenses`, expenseId);
  return await deleteDoc(docRef);
}

export async function getExpenses(gymId) {
  const colRef = collection(db, `gyms/${gymId}/expenses`);
  const q = query(colRef, orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
