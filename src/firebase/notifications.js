import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./config";

export async function getExpiringMembers(gymId, daysAhead = 7) {
  return [];
}

export async function addNotification(gymId, notifData) {
  const colRef = collection(db, `gyms/${gymId}/notifications`);
  return await addDoc(colRef, {
    ...notifData,
    createdAt: new Date().toISOString()
  });
}
