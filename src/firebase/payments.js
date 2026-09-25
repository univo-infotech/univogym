import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";
import { getCachedData, setCachedData, invalidateCache } from "../utils/dataCache";

let inMemoryPayments = [];

/**
 * Helper to get in-memory payments cache
 */
function getLocalPayments() {
  return inMemoryPayments;
}

/**
 * Helper to save in-memory payments cache
 */
function saveLocalPayment(payment) {
  inMemoryPayments = [payment, ...inMemoryPayments.filter((p) => p.id !== payment.id)].slice(0, 100);
}

/**
 * Get single payment by ID directly from Firestore
 */
export async function getPaymentById(paymentId) {
  if (!paymentId) return null;

  try {
    const docRef = doc(db, "payments", paymentId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
  } catch (e) {
    console.warn("Error fetching payment from Firestore top-level:", e);
  }

  // Check in-memory runtime cache
  const local = inMemoryPayments.find((p) => p.id === paymentId);
  if (local) return local;

  return null;
}

/**
 * Get all payments for a member from Firestore.
 * Supports both getMemberPayments(memberId) and getMemberPayments(gymId, memberId).
 */
export async function getMemberPayments(gymIdOrMemberId, maybeMemberId) {
  const targetMemberId = maybeMemberId || gymIdOrMemberId;
  if (!targetMemberId) return [];

  let serverList = [];

  try {
    const q = query(
      collection(db, "payments"),
      where("memberId", "==", targetMemberId)
    );
    const snap = await getDocs(q);
    serverList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    try {
      const allSnap = await getDocs(collection(db, "payments"));
      serverList = allSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => p.memberId === targetMemberId);
    } catch (fallbackErr) {
      console.error("getMemberPayments fallback error:", fallbackErr);
    }
  }

  // In-memory sort by date / createdAt descending
  serverList.sort((a, b) => {
    const dateA = a.date || a.createdAt || "";
    const dateB = b.date || b.createdAt || "";
    return dateB.localeCompare(dateA);
  });

  return serverList;
}

/**
 * Add a new payment record directly to Firebase Firestore.
 */
export async function addPayment(gymIdOrPayment, maybePayment) {
  let paymentObj = maybePayment || gymIdOrPayment;
  let gymId = maybePayment ? gymIdOrPayment : (paymentObj.gymId || "univo_main");

  const paymentRecord = {
    ...paymentObj,
    gymId,
    status: paymentObj.status || (Number(paymentObj.dueAmount) > 0 ? "partial" : "paid"),
    createdAt: new Date().toISOString(),
  };

  const assignedId = paymentRecord.id || "bill_" + Date.now();
  paymentRecord.id = assignedId;
  saveLocalPayment(paymentRecord);
  invalidateCache("payments");
  invalidateCache("members");

  try {
    const ref = await addDoc(collection(db, "payments"), {
      ...paymentRecord,
      createdAt: serverTimestamp(),
    });
    const finalId = ref.id || assignedId;
    
    // Also save in gyms/{gymId}/payments for subcollection queries
    try {
      await setDoc(doc(db, "gyms", gymId, "payments", finalId), {
        ...paymentRecord,
        id: finalId,
        createdAt: serverTimestamp(),
      }, { merge: true });
    } catch (subErr) {}

    return finalId;
  } catch (err) {
    console.warn("addPayment Firestore notice:", err);
    return assignedId;
  }
}

export async function getAllPayments(gymId, forceRefresh = false) {
  const targetGymId = gymId || "univo_main";
  const cacheKey = `payments_${targetGymId}`;

  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached && cached.isFresh) {
      return cached.data;
    }
  }

  try {
    const q = query(
      collection(db, "payments"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    const serverList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    setCachedData(cacheKey, serverList);
    inMemoryPayments = serverList;
    return serverList;
  } catch (err) {
    try {
      const snapAll = await getDocs(collection(db, "payments"));
      const serverList = snapAll.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCachedData(cacheKey, serverList);
      inMemoryPayments = serverList;
      return serverList;
    } catch (e2) {
      console.error("getAllPayments error:", e2);
      return inMemoryPayments;
    }
  }
}
