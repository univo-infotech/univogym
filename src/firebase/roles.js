import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from './config';

export async function getRoles(gymId) {
  const q = query(collection(db, 'gyms', gymId, 'roles'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addRole(gymId, data) {
  const ref = collection(db, 'gyms', gymId, 'roles');
  const docRef = await addDoc(ref, data);
  return docRef.id;
}

export async function updateRole(gymId, roleId, data) {
  const ref = doc(db, 'gyms', gymId, 'roles', roleId);
  await updateDoc(ref, data);
}

export async function deleteRole(gymId, roleId) {
  const ref = doc(db, 'gyms', gymId, 'roles', roleId);
  await deleteDoc(ref);
}
