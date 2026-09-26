import {
  collection,
  doc,
  getDocs,
  getDoc,
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

// ─── Trainer Salary History ───────────────────────────────────────
export async function markTrainerSalaryPaid(gymId, trainerId, monthKey, paidData) {
  const ref = doc(db, "gyms", gymId, "trainers", trainerId, "salaryHistory", monthKey);
  await setDoc(ref, {
    ...paidData,
    paidAt: serverTimestamp(),
    status: "paid",
  }, { merge: true });
}

export async function getTrainerSalaryHistory(gymId, trainerId) {
  try {
    const snap = await getDocs(
      collection(db, "gyms", gymId, "trainers", trainerId, "salaryHistory")
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

// ─── Staff Daily Attendance ──────────────────────────────────────
export async function markStaffAttendance(gymId, staffId, date, status = "present", notes = "") {
  const ref = doc(db, "gyms", gymId, "staff", staffId, "attendance", date);
  await setDoc(ref, {
    date,
    status, // "present" | "absent" | "halfday" | "weekly_off" | "paid_leave"
    notes,
    markedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getStaffAttendanceForMonth(gymId, staffId, monthKey) {
  try {
    const snap = await getDocs(
      collection(db, "gyms", gymId, "staff", staffId, "attendance")
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((d) => d.date && d.date.startsWith(monthKey));
  } catch {
    return [];
  }
}

// ─── Monthly Leaves & Attendance Overrides ───────────────────────
export async function setEmployeeMonthlyLeaves(gymId, empId, monthKey, leavesData, isTrainer = false) {
  const collectionName = isTrainer ? "trainers" : "staff";
  const ref = doc(db, "gyms", gymId, collectionName, empId, "monthlyLeaves", monthKey);
  await setDoc(ref, {
    ...leavesData,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getEmployeeMonthlyLeaves(gymId, empId, monthKey, isTrainer = false) {
  try {
    const collectionName = isTrainer ? "trainers" : "staff";
    const ref = doc(db, "gyms", gymId, collectionName, empId, "monthlyLeaves", monthKey);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch {
    return null;
  }
}


