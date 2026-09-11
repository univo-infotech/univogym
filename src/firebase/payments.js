import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

/**
 * Get all payments for a member.
 * @param {string} memberId
 * @returns {Promise<Array>}
 */
export async function getMemberPayments(memberId) {
  try {
    const q = query(
      collection(db, "payments"),
      where("memberId", "==", memberId),
      orderBy("date", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("getMemberPayments error:", err);
    return [];
  }
}

/**
 * Add a new payment record.
 * @param {Object} payment { memberId, gymId, amount, mode, plan, referenceId, date, notes }
 * @returns {Promise<string>} new document ID
 */
export async function addPayment(payment) {
  const ref = await addDoc(collection(db, "payments"), {
    ...payment,
    status: "paid",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getAllPayments(gymId) {
  try {
    const q = query(
      collection(db, "payments"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("getAllPayments error:", err);
    return [];
  }
}
