import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

/**
 * Helper to get local payments cache
 */
function getLocalPayments() {
  try {
    const raw = localStorage.getItem("univo_recent_payments");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Helper to save local payments cache
 */
function saveLocalPayment(payment) {
  try {
    const list = getLocalPayments();
    // Prepend new payment avoiding duplicates
    const filtered = list.filter((p) => p.id !== payment.id);
    localStorage.setItem("univo_recent_payments", JSON.stringify([payment, ...filtered].slice(0, 100)));
  } catch (e) {
    console.warn("Could not save to local payments cache:", e);
  }
}

/**
 * Get single payment by ID (from local cache or Firestore)
 */
export async function getPaymentById(paymentId) {
  if (!paymentId) return null;
  // 1. Check local cache
  const local = getLocalPayments().find((p) => p.id === paymentId);
  if (local) return local;

  // 2. Check Firestore
  try {
    const docRef = doc(db, "payments", paymentId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
  } catch (e) {
    console.warn("Error fetching payment from Firestore:", e);
  }
  return null;
}

/**
 * Get all payments for a member.
 * @param {string} memberId
 * @returns {Promise<Array>}
 */
export async function getMemberPayments(memberId) {
  const localList = getLocalPayments().filter((p) => p.memberId === memberId);
  try {
    const q = query(
      collection(db, "payments"),
      where("memberId", "==", memberId),
      orderBy("date", "desc")
    );
    const snap = await getDocs(q);
    const serverList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Merge server and local, prioritizing server if duplicate IDs
    const serverIds = new Set(serverList.map((p) => p.id));
    const merged = [...serverList, ...localList.filter((p) => !serverIds.has(p.id))];
    return merged.length > 0 ? merged : localList;
  } catch (err) {
    console.error("getMemberPayments error:", err);
    return localList;
  }
}

/**
 * Add a new payment record.
 * @param {Object} payment { memberId, gymId, amount, mode, plan, referenceId, date, notes }
 * @returns {Promise<string>} new document ID
 */
export async function addPayment(gymIdOrPayment, maybePayment) {
  // Support both addPayment(payment) and addPayment(gymId, payment)
  let paymentObj = maybePayment || gymIdOrPayment;
  let gymId = maybePayment ? gymIdOrPayment : (paymentObj.gymId || "univo_main");

  const paymentRecord = {
    ...paymentObj,
    gymId,
    status: paymentObj.status || (Number(paymentObj.dueAmount) > 0 ? "partial" : "paid"),
    createdAt: new Date().toISOString(),
  };

  // Always cache locally first so UI updates immediately
  const assignedId = paymentRecord.id || "bill_" + Date.now();
  paymentRecord.id = assignedId;
  saveLocalPayment(paymentRecord);

  try {
    const ref = await addDoc(collection(db, "payments"), {
      ...paymentRecord,
      createdAt: serverTimestamp(),
    });
    return ref.id || assignedId;
  } catch (err) {
    console.warn("addPayment offline save fallback:", err);
    return assignedId;
  }
}

export async function getAllPayments(gymId) {
  const localList = getLocalPayments();
  try {
    const q = query(
      collection(db, "payments"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    const serverList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const serverIds = new Set(serverList.map((p) => p.id));
    const merged = [...serverList, ...localList.filter((p) => !serverIds.has(p.id))];
    return merged.length > 0 ? merged : localList;
  } catch (err) {
    console.error("getAllPayments error:", err);
    return localList;
  }
}
