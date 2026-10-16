import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./config";
import { addPayment } from "./payments";
import { updateMember, getMember } from "./members";
import { invalidateCache } from "../utils/dataCache";
import { formatDate, parseToDate } from "../utils/dateUtils";
import { openWhatsApp } from "../utils/whatsapp";

// In-memory local fallback storage
const LOCAL_STORAGE_KEY = "univo_renewal_requests";

function getLocalRequests() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalRequests(list) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}
}

/**
 * Fetch all renewal/PT subscription requests for a gym.
 */
export async function getRenewalRequests(gymId = "univo_main") {
  const targetGymId = gymId || "univo_main";
  let requests = [];
  const seenIds = new Set();

  try {
    // 1. Check top-level renewal_requests collection
    const q1 = query(
      collection(db, "renewal_requests"),
      where("gymId", "==", targetGymId)
    );
    const snap1 = await getDocs(q1);
    snap1.docs.forEach((d) => {
      seenIds.add(d.id);
      requests.push({ id: d.id, ...d.data() });
    });
  } catch (err) {
    console.warn("Top-level renewal_requests query notice:", err);
  }

  try {
    // 2. Check gym subcollection gyms/{gymId}/renewal_requests
    const snap2 = await getDocs(collection(db, "gyms", targetGymId, "renewal_requests"));
    snap2.docs.forEach((d) => {
      if (!seenIds.has(d.id)) {
        seenIds.add(d.id);
        requests.push({ id: d.id, ...d.data() });
      } else {
        const idx = requests.findIndex((r) => r.id === d.id);
        if (idx >= 0) requests[idx] = { ...requests[idx], ...d.data() };
      }
    });
  } catch (err2) {
    console.warn("Sub-collection renewal_requests query notice:", err2);
  }

  // 3. Merge locally persisted requests
  const local = getLocalRequests();
  local.forEach((lr) => {
    if (!seenIds.has(lr.id)) {
      seenIds.add(lr.id);
      requests.unshift(lr);
    } else {
      const idx = requests.findIndex((r) => r.id === lr.id);
      if (idx >= 0 && lr.updatedAt) {
        requests[idx] = { ...requests[idx], ...lr };
      }
    }
  });

  // Sort: pending first, then newest first
  requests.sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    const timeA = new Date(a.submittedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.submittedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return requests;
}

/**
 * Submit a new Plan Renewal or PT Subscription request from Member portal.
 */
export async function submitRenewalRequest(gymId = "univo_main", requestData) {
  const targetGymId = gymId || "univo_main";
  const requestId = "req_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  const nowIso = new Date().toISOString();

  const payload = {
    ...requestData,
    id: requestId,
    gymId: targetGymId,
    status: "pending",
    submittedAt: nowIso,
    updatedAt: nowIso,
  };

  // 1. Immediately cache locally
  const currentLocal = getLocalRequests();
  saveLocalRequests([payload, ...currentLocal]);

  // 2. Save in top-level collection
  try {
    await setDoc(doc(db, "renewal_requests", requestId), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (e1) {
    console.warn("Error saving to renewal_requests:", e1);
  }

  // 3. Save in gym subcollection
  try {
    await setDoc(doc(db, "gyms", targetGymId, "renewal_requests", requestId), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (e2) {
    console.warn("Error saving to gym subcollection renewal_requests:", e2);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("univo_renewal_changed"));
  }

  return payload;
}

/**
 * Approve a renewal or PT request:
 * 1. Mark request as 'approved'
 * 2. Record full payment in payments collection
 * 3. Update member's plan validity / PT package in members collection
 * 4. Send WhatsApp notification to member
 */
export async function approveRenewalRequest(gymId = "univo_main", requestId, options = {}) {
  const targetGymId = gymId || "univo_main";
  const nowIso = new Date().toISOString();
  const todayStr = nowIso.split("T")[0];

  // 1. Fetch request details
  const allReqs = await getRenewalRequests(targetGymId);
  const req = allReqs.find((r) => r.id === requestId);
  if (!req) throw new Error("Renewal request not found");

  // 2. Fetch current member details
  const member = await getMember(targetGymId, req.memberId);
  if (!member) throw new Error("Member profile not found");

  const durationDays = Number(req.durationDays) || 30;
  const durationMonths = Number(req.durationMonths) || 1;
  const isPt = Boolean(req.isPt || req.requestType === "pt_activation");

  let newValidityStart = todayStr;
  let newValidityEnd = todayStr;

  // Calculate new dates
  if (isPt) {
    // 1-on-1 PT Coaching
    newValidityStart = todayStr;
    const endD = new Date();
    endD.setDate(endD.getDate() + durationDays);
    newValidityEnd = endD.toISOString().split("T")[0];
  } else {
    // General Gym Membership Renewal
    // If current expiry is in the future, extend from that date!
    const curExp = parseToDate(member.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (curExp && curExp.getTime() > today.getTime()) {
      // Still active: extend from current expiry
      const nextStart = new Date(curExp);
      nextStart.setDate(nextStart.getDate() + 1);
      newValidityStart = nextStart.toISOString().split("T")[0];

      const nextEnd = new Date(curExp);
      nextEnd.setDate(nextEnd.getDate() + durationDays);
      newValidityEnd = nextEnd.toISOString().split("T")[0];
    } else {
      // Expired: start from today
      newValidityStart = todayStr;
      const nextEnd = new Date();
      nextEnd.setDate(nextEnd.getDate() + durationDays);
      newValidityEnd = nextEnd.toISOString().split("T")[0];
    }
  }

  // 3. Record Payment in payments collection
  const billId = "bill_upi_" + Date.now();
  const paymentRecord = {
    id: billId,
    memberId: req.memberId,
    memberName: req.memberName || member.name || member.fullName,
    phone: req.memberPhone || member.phone || "",
    planName: isPt ? `Personal Training (PT) - ${req.planName}` : req.planName,
    planType: isPt ? "PT" : "membership",
    amount: Number(req.amountPaid || req.planPrice || 0),
    paidAmount: Number(req.amountPaid || req.planPrice || 0),
    dueAmount: 0,
    paymentMode: "online",
    paymentType: "full",
    reference: `UPI-UTR: ${req.utrNumber || "N/A"}`,
    validityStart: formatDate(newValidityStart, ""),
    validityEnd: formatDate(newValidityEnd, ""),
    dueDate: formatDate(newValidityEnd, ""),
    date: formatDate(todayStr, ""),
    status: "paid",
    remarks: `Online UPI QR Payment (UTR: ${req.utrNumber || "Verified"})${options.notes ? " • " + options.notes : ""}`,
    createdAt: nowIso,
  };

  await addPayment(targetGymId, paymentRecord);

  // 4. Update Member Document
  const memberUpdates = isPt
    ? {
        isPt: true,
        isPTMember: true,
        hasPersonalCoach: true,
        ptStatus: "active",
        ptPlanName: req.planName,
        ptPlanPrice: Number(req.amountPaid || req.planPrice || 0),
        ptStartDate: newValidityStart,
        ptEndDate: newValidityEnd,
        ptDurationDays: durationDays,
        trainerId: req.trainerId || member.trainerId || "",
        trainerName: req.trainerName || member.trainerName || "Assigned Coach",
        status: "active",
        active: true,
        lastPaymentDate: nowIso,
        paidAmount: Number(member.paidAmount || 0) + Number(req.amountPaid || 0),
      }
    : {
        planName: req.planName,
        planPrice: Number(req.amountPaid || req.planPrice || 0),
        expiryDate: newValidityEnd,
        status: "active",
        active: true,
        lastPaymentDate: nowIso,
        paidAmount: Number(member.paidAmount || 0) + Number(req.amountPaid || 0),
        dueAmount: 0,
      };

  await updateMember(targetGymId, req.memberId, memberUpdates);

  // 5. Update Request Status to 'approved'
  const approvedData = {
    status: "approved",
    approvedAt: nowIso,
    approvedBy: options.approvedBy || "Gym Owner",
    billId,
    newValidityStart,
    newValidityEnd,
    updatedAt: nowIso,
  };

  // Update in Firestore
  try {
    await updateDoc(doc(db, "renewal_requests", requestId), approvedData);
  } catch (e) {}
  try {
    await updateDoc(doc(db, "gyms", targetGymId, "renewal_requests", requestId), approvedData);
  } catch (e) {}

  // Update in local storage
  const currentLocal = getLocalRequests();
  saveLocalRequests(
    currentLocal.map((r) => (r.id === requestId ? { ...r, ...approvedData } : r))
  );

  invalidateCache("members");
  invalidateCache("payments");

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("univo_renewal_changed"));
  }

  // 6. Send WhatsApp confirmation if requested
  if (options.sendWhatsApp !== false && (req.memberPhone || member.phone)) {
    const rawPhone = (req.memberPhone || member.phone).replace(/\D/g, "");
    if (rawPhone.length >= 10) {
      const msg = isPt
        ? `🎉 *PT Package Approved & Activated! - UNIVO GYM*\n\nHi ${req.memberName || member.name},\nYour online payment of *₹${req.amountPaid}* via UPI (UTR: *${req.utrNumber}*) has been verified and approved!\n\n⭐ *PT Plan:* ${req.planName}\n🏋️ *Assigned Coach:* ${req.trainerName || "Coach"}\n📅 *PT Validity:* ${formatDate(newValidityStart)} to ${formatDate(newValidityEnd)}\n\nYour 1-on-1 coaching access is now active. Let's achieve your transformation goals! 💪🔥`
        : `🎉 *Membership Renewed Successfully! - UNIVO GYM*\n\nHi ${req.memberName || member.name},\nYour online payment of *₹${req.amountPaid}* via UPI (UTR: *${req.utrNumber}*) has been verified and approved!\n\n📋 *Plan:* ${req.planName}\n📅 *New Expiry Date:* ${formatDate(newValidityEnd)}\n✅ *Status:* ACTIVE\n\nThank you for renewing your gym membership! Keep crushing your workouts! 💪🔥`;

      openWhatsApp(rawPhone, msg);
    }
  }

  return { success: true, paymentRecord, memberUpdates };
}

/**
 * Reject a renewal request with a reason (e.g. UTR not found in bank).
 */
export async function rejectRenewalRequest(gymId = "univo_main", requestId, reason = "Payment reference not matched") {
  const targetGymId = gymId || "univo_main";
  const nowIso = new Date().toISOString();

  const rejectData = {
    status: "rejected",
    rejectionReason: reason,
    rejectedAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    await updateDoc(doc(db, "renewal_requests", requestId), rejectData);
  } catch (e) {}
  try {
    await updateDoc(doc(db, "gyms", targetGymId, "renewal_requests", requestId), rejectData);
  } catch (e) {}

  const currentLocal = getLocalRequests();
  saveLocalRequests(
    currentLocal.map((r) => (r.id === requestId ? { ...r, ...rejectData } : r))
  );

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("univo_renewal_changed"));
  }

  return { success: true };
}
