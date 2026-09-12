import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./config";

// ─── Staff CRUD ─────────────────────────────────────────────────
export async function getStaff(gymId) {
  const q = query(
    collection(db, "gyms", gymId, "staff"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addStaff(gymId, data) {
  const ref = collection(db, "gyms", gymId, "staff");
  const docRef = await addDoc(ref, {
    ...data,
    isActive: data.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateStaff(gymId, staffId, data) {
  const ref = doc(db, "gyms", gymId, "staff", staffId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteStaff(gymId, staffId) {
  const ref = doc(db, "gyms", gymId, "staff", staffId);
  await deleteDoc(ref);
}

// ─── Leave Management ────────────────────────────────────────────
export async function addLeave(gymId, staffId, leaveData) {
  const ref = collection(db, "gyms", gymId, "staff", staffId, "leaves");
  const docRef = await addDoc(ref, {
    ...leaveData,
    status: leaveData.status || "approved",
    appliedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getLeaves(gymId, staffId) {
  try {
    const q = query(
      collection(db, "gyms", gymId, "staff", staffId, "leaves"),
      orderBy("appliedAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

export async function updateLeave(gymId, staffId, leaveId, data) {
  const ref = doc(db, "gyms", gymId, "staff", staffId, "leaves", leaveId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteLeave(gymId, staffId, leaveId) {
  const ref = doc(db, "gyms", gymId, "staff", staffId, "leaves", leaveId);
  await deleteDoc(ref);
}

// ─── Payroll Entries (Bonus / Deduction) ─────────────────────────
export async function getPayrollEntries(gymId, staffId) {
  try {
    const q = query(
      collection(db, "gyms", gymId, "staff", staffId, "payroll"),
      orderBy("date", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

export async function addPayrollEntry(gymId, staffId, entry) {
  const ref = collection(db, "gyms", gymId, "staff", staffId, "payroll");
  const docRef = await addDoc(ref, {
    ...entry,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function deletePayrollEntry(gymId, staffId, entryId) {
  const ref = doc(db, "gyms", gymId, "staff", staffId, "payroll", entryId);
  await deleteDoc(ref);
}

// ─── Salary History ──────────────────────────────────────────────
export async function markSalaryPaid(gymId, staffId, monthKey, paidData) {
  const ref = doc(db, "gyms", gymId, "staff", staffId, "salaryHistory", monthKey);
  await setDoc(ref, {
    ...paidData,
    paidAt: serverTimestamp(),
    status: "paid",
  }, { merge: true });
}

export async function getSalaryHistory(gymId, staffId) {
  try {
    const snap = await getDocs(
      collection(db, "gyms", gymId, "staff", staffId, "salaryHistory")
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

