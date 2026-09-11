import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

export async function getTrainers(gymId) {
  const q = query(
    collection(db, "gyms", gymId, "trainers"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getTrainer(gymId, trainerId) {
  const ref = doc(db, "gyms", gymId, "trainers", trainerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function addTrainer(gymId, data) {
  const ref = collection(db, "gyms", gymId, "trainers");
  const docRef = await addDoc(ref, {
    ...data,
    memberCount: 0,
    rating: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateTrainer(gymId, trainerId, data) {
  const ref = doc(db, "gyms", gymId, "trainers", trainerId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteTrainer(gymId, trainerId) {
  const ref = doc(db, "gyms", gymId, "trainers", trainerId);
  await deleteDoc(ref);
}

export async function getTrainerMembers(gymId, trainerId) {
  const q = query(
    collection(db, "gyms", gymId, "members"),
    where("trainerId", "==", trainerId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getTrainerBeforeAfter(gymId, trainerId) {
  const q = query(
    collection(db, "gyms", gymId, "beforeAfter"),
    where("trainerId", "==", trainerId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getTrainerPlans(gymId, trainerId) {
  const q = query(
    collection(db, "gyms", gymId, "workoutPlans"),
    where("trainerId", "==", trainerId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getBeforeAfterByTrainer(gymId, trainerId) {
  return await getTrainerBeforeAfter(gymId, trainerId);
}
