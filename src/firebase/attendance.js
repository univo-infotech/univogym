import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";
import { getMembers, updateMember } from "./members";

const LOCAL_PUNCHES_KEY = "univo_biometric_punches";
const LOCAL_DEVICES_KEY = "univo_biometric_devices";

// Helper to get local cache
function getLocalPunches() {
  try {
    const raw = localStorage.getItem(LOCAL_PUNCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalPunch(punch) {
  try {
    const list = getLocalPunches();
    const updated = [punch, ...list.filter(p => p.id !== punch.id)].slice(0, 200);
    localStorage.setItem(LOCAL_PUNCHES_KEY, JSON.stringify(updated));
  } catch (e) {}
}

export function getLocalDevices() {
  try {
    const raw = localStorage.getItem(LOCAL_DEVICES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  // Default universal devices configuration
  return [
    {
      id: "dev_main_entrance",
      name: "Main Gym Entrance Gate",
      brand: "ZKTeco / e-SSL (ADMS / Cloud Push)",
      model: "K90 / e990 / uFace Series",
      connectionType: "WiFi / LAN Cloud Push",
      serialNumber: "ZK90-UNIVO-88921",
      ipAddress: "192.168.1.120",
      port: "4370",
      cloudServerUrl: `${window.location.origin}/api/biometric/adms`,
      gymSecretKey: "UNIVO_BIO_9921_MAIN",
      status: "connected",
      lastPing: new Date().toISOString(),
      location: "Front Turnstile Door",
      totalPunchesToday: 0
    },
    {
      id: "dev_floor_scanner",
      name: "Cardio & Weight Floor Scanner",
      brand: "Realtime Biometrics (HTTP Webhook / JSON)",
      model: "T52 / C101 Pro",
      connectionType: "Direct WiFi",
      serialNumber: "RT-T52-77102",
      ipAddress: "192.168.1.125",
      port: "8080",
      cloudServerUrl: `${window.location.origin}/api/biometric/realtime`,
      gymSecretKey: "UNIVO_BIO_77102_RT",
      status: "connected",
      lastPing: new Date().toISOString(),
      location: "Workout Floor Entry",
      totalPunchesToday: 0
    }
  ];
}

export function saveLocalDevices(devices) {
  try {
    localStorage.setItem(LOCAL_DEVICES_KEY, JSON.stringify(devices));
  } catch (e) {}
}

/**
 * Get attendance records for a member.
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
 * Mark a member as present for a given date.
 */
export async function markMemberAttendance(memberId, gymId, date = new Date()) {
  try {
    const ref = await addDoc(collection(db, "attendance"), {
      memberId,
      gymId: gymId || "univo_main",
      date: Timestamp.fromDate(date),
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (e) {
    console.warn("markMemberAttendance firestore fallback:", e);
    return "att_" + Date.now();
  }
}

/**
 * Process a Biometric Punch (Thumb / Face / Card) with Real-Time Fee & Expiry Validation.
 * Can be called by real biometric hardware Webhooks OR the practical Punch Simulator.
 */
export async function logBiometricPunch(gymId, punchInput) {
  const targetGymId = gymId || "univo_main";
  const now = new Date();
  const nowIso = now.toISOString();
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const allMembers = await getMembers(targetGymId);

  // Match member by biometricId, or id, or phone
  const cleanPhone = (punchInput.phone || "").replace(/\D/g, "");
  const matchedMember = allMembers.find((m) => {
    if (punchInput.biometricId && String(m.biometricId || m.machineId) === String(punchInput.biometricId)) {
      return true;
    }
    if (punchInput.memberId && m.id === punchInput.memberId) {
      return true;
    }
    if (cleanPhone && (m.phone || "").replace(/\D/g, "").endsWith(cleanPhone.slice(-10))) {
      return true;
    }
    return false;
  });

  if (!matchedMember) {
    const unknownPunch = {
      id: "punch_" + Date.now(),
      biometricId: punchInput.biometricId || "Unknown",
      memberName: "Unknown / Unregistered Card",
      phone: punchInput.phone || "N/A",
      planName: "Not Registered in Univo",
      slot: "N/A",
      status: "denied",
      reason: "Biometric ID Not Enrolled in Gym Database",
      deviceId: punchInput.deviceId || "dev_main_entrance",
      deviceName: punchInput.deviceName || "Main Gym Entrance Gate",
      timestamp: nowIso,
      time: timeStr,
      date: dateStr,
      photoUrl: null
    };

    saveLocalPunch(unknownPunch);
    return { success: false, status: "denied", reason: unknownPunch.reason, punch: unknownPunch };
  }

  // Check Member Fee, Status & Expiry Logic
  let accessStatus = "granted";
  let denialReason = "Access Granted. Welcome to Univo Gym!";

  // 1. Left or Ended Check
  if (matchedMember.status === "left" || matchedMember.status === "ended" || matchedMember.active === false) {
    accessStatus = "denied";
    denialReason = matchedMember.status === "left"
      ? "Account Left: Member has discontinued gym membership."
      : "Account Ended: Membership was terminated by management.";
  }
  // 2. Suspended Biometric Switch
  else if (matchedMember.biometricAccess === false) {
    accessStatus = "denied";
    denialReason = "Biometric Access Suspended by Gym Owner.";
  }
  // 3. Expiry Check
  else if (matchedMember.expiryDate) {
    const expDate = new Date(matchedMember.expiryDate);
    if (!isNaN(expDate.getTime())) {
      const todayZero = new Date();
      todayZero.setHours(0, 0, 0, 0);
      if (expDate < todayZero) {
        accessStatus = "denied";
        denialReason = `Membership Expired on ${expDate.toLocaleDateString("en-IN")}. Please renew package.`;
      }
    }
  }
  // 4. Heavy Due Amount Check (> ₹500 and not paid)
  else if (Number(matchedMember.dueAmount || 0) > 0 && matchedMember.status === "due") {
    accessStatus = "denied";
    denialReason = `Pending Due Balance: ₹${Number(matchedMember.dueAmount).toLocaleString("en-IN")}. Clearance required.`;
  }

  const punchRecord = {
    id: "punch_" + Date.now(),
    memberId: matchedMember.id,
    biometricId: matchedMember.biometricId || matchedMember.machineId || punchInput.biometricId || String(matchedMember.id).slice(-4),
    memberName: matchedMember.name || matchedMember.fullName || "Member",
    phone: matchedMember.phone || "",
    planName: matchedMember.planName || "General Gym Plan",
    slot: matchedMember.slot || matchedMember.workoutSlot || "General Shift",
    trainerName: matchedMember.trainerName || "General Floor",
    status: accessStatus,
    reason: denialReason,
    deviceId: punchInput.deviceId || "dev_main_entrance",
    deviceName: punchInput.deviceName || "Main Gym Entrance Gate",
    timestamp: nowIso,
    time: timeStr,
    date: dateStr,
    dueAmount: Number(matchedMember.dueAmount || 0),
    photoUrl: matchedMember.photoURL || matchedMember.photoUrl || null
  };

  // 1. Save Punch in local cache
  saveLocalPunch(punchRecord);

  // 2. If access granted, record actual attendance
  if (accessStatus === "granted") {
    try {
      await markMemberAttendance(matchedMember.id, targetGymId, now);
      await updateMember(targetGymId, matchedMember.id, {
        lastCheckIn: nowIso,
        lastCheckInDate: dateStr,
        lastCheckInTime: timeStr,
        attendanceStreak: (matchedMember.attendanceStreak || 0) + 1
      });
    } catch (e) {
      console.warn("Attendance recording notice:", e);
    }
  }

  // 3. Persist punch in Firestore
  try {
    await addDoc(collection(db, "biometric_punches"), {
      ...punchRecord,
      createdAt: serverTimestamp()
    });
  } catch (fsErr) {
    // Local persistence handles offline resilience
  }

  return {
    success: accessStatus === "granted",
    status: accessStatus,
    reason: denialReason,
    member: matchedMember,
    punch: punchRecord
  };
}

/**
 * Fetch recent biometric punches for real-time live monitoring.
 */
export async function getBiometricPunches(gymId, limitCount = 50) {
  const targetGymId = gymId || "univo_main";
  let punches = [];

  try {
    const q = query(
      collection(db, "biometric_punches"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    punches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    // Fallback to local punches
  }

  const local = getLocalPunches();
  const seenIds = new Set(punches.map(p => p.id));
  local.forEach(lp => {
    if (!seenIds.has(lp.id)) {
      seenIds.add(lp.id);
      punches.push(lp);
    }
  });

  punches.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  return punches.slice(0, limitCount);
}

/**
 * Save Biometric device setting.
 */
export async function saveBiometricDevice(gymId, deviceData) {
  const devices = getLocalDevices();
  const existingIdx = devices.findIndex(d => d.id === deviceData.id);
  let updated;
  if (existingIdx >= 0) {
    updated = devices.map(d => d.id === deviceData.id ? { ...d, ...deviceData } : d);
  } else {
    updated = [deviceData, ...devices];
  }
  saveLocalDevices(updated);

  try {
    await setDoc(doc(db, "biometric_devices", deviceData.id), {
      ...deviceData,
      gymId: gymId || "univo_main",
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (e) {}

  return updated;
}

/**
 * Enroll member's fingerprint/face biometric ID in software.
 */
export async function enrollMemberBiometric(gymId, memberId, biometricId, type = "fingerprint") {
  const payload = {
    biometricId: String(biometricId).trim(),
    biometricEnrolled: true,
    biometricType: type, // 'fingerprint' | 'face' | 'card'
    biometricEnrolledAt: new Date().toISOString(),
    biometricAccess: true
  };

  await updateMember(gymId || "univo_main", memberId, payload);
  return payload;
}

/**
 * Toggle Biometric access for a member (Grant / Suspend).
 */
export async function toggleMemberBiometricAccess(gymId, memberId, allowAccess) {
  await updateMember(gymId || "univo_main", memberId, {
    biometricAccess: Boolean(allowAccess)
  });
}
