import { collection, addDoc } from "firebase/firestore";
import { db } from "./config";
import { getMembers } from "./members";
import { parseToDate } from "../utils/dateUtils";

export async function getExpiringMembers(gymId, daysAhead = 7) {
  try {
    const members = await getMembers(gymId);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return members.filter((m) => {
      if (m.status === 'left' || m.active === false) return false;
      const expiry = parseToDate(m.expiryDate);
      if (!expiry) return false;
      const expZero = new Date(expiry);
      expZero.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((expZero - now) / (1000 * 60 * 60 * 24));
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
