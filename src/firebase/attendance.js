import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";

/**
 * Get attendance records for a member.
 * @param {string} memberId
 * @returns {Promise<Array>}
 */
export async function getMemberAttendance(memberId) {
  try {
    const q = query(
      collection(db, "attendance"),
      where("memberId", "==", memberId),
      orderBy("date", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("getMemberAttendance error:", err);
    return [];
  }
}

/**
 * Mark a member as present for a given date (defaults to today).
 * @param {string} memberId
 * @param {string} gymId
 * @param {Date}   date    optional, defaults to now
 * @returns {Promise<string>}
 */
export async function markMemberAttendance(memberId, gymId, date = new Date()) {
  const ref = await addDoc(collection(db, "attendance"), {
    memberId,
    gymId,
    date: Timestamp.fromDate(date),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
