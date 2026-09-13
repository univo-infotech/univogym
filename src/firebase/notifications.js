import { collection, addDoc } from "firebase/firestore";
import { db } from "./config";
import { getMembers } from "./members";

export async function getExpiringMembers(gymId, daysAhead = 7) {
  try {
    const members = await getMembers(gymId);
    const now = new Date();
    return members.filter((m) => {
      if (m.status === 'left' || m.active === false) return false;
      const expiry = m.expiryDate ? new Date(m.expiryDate) : null;
      if (!expiry) return false;
      const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      return diffDays <= daysAhead;
    });
  } catch (err) {
    console.warn("getExpiringMembers error:", err);
    return [];
  }
}

export async function addNotification(gymId, notifData) {
  const colRef = collection(db, `gyms/${gymId}/notifications`);
  return await addDoc(colRef, {
    ...notifData,
    createdAt: new Date().toISOString()
  });
}
