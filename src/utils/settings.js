import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

// Default Gym Settings
const DEFAULT_SETTINGS = {
  gymName: "UNIVO GYM MANAGEMENT",
  tagline: "Stronger Today, Healthier Tomorrow",
  phone: "+91 9196302375",
  address: "Main Branch, Univo Fitness Centre",
  whatsappWelcome: "💪 *Welcome to {gym_name}!*\n\nHi {name},\nYour membership for *{plan}* has been successfully activated.\n\nThank you for choosing us! Let's get stronger together! 🔥",
  whatsappReminder: "⚠️ *Gym Renewal Reminder*\n\nHi {name},\nYour membership for *{plan}* is expiring on *{expiry}*.\nPending/Renewal Amount: ₹{amount}.\n\nRenew today to maintain your workout consistency! 💪\n— {gym_name}",
  whatsappPtReminder: "✨ *Personal Training (PT) Renewal Reminder*\n\nHi {name},\nYour 1-on-1 Personal Training package with *{trainer}* ({plan}) is expiring on *{expiry}*.\nRenewal Amount: ₹{amount}.\n\nRenew your PT package today to keep achieving your personal transformation goals! 🎯🔥\n— {gym_name}",
  whatsappReceipt: "🧾 *Payment Receipt - {gym_name}*\n\nMember: {name}\nPlan: {plan}\nPaid: ₹{amount}\nDate: {date}\n\nThank you for training with us!",
  ownerSignatureName: "Authorized Signatory",
  ownerSignatureTitle: "Gym Manager / Owner",
  logoUrl: "/logo-icon.png",
  signatureUrl: "",
  workoutSlots: [
    { id: "morning", label: "Morning", time: "6:00 AM - 9:00 AM", iconName: "Sun" },
    { id: "afternoon", label: "Afternoon", time: "12:00 PM - 3:00 PM", iconName: "Sun" },
    { id: "evening", label: "Evening", time: "4:00 PM - 7:00 PM", iconName: "Sunset" },
    { id: "night", label: "Night", time: "7:00 PM - 10:00 PM", iconName: "Moon" }
  ]
};

// In-memory runtime cache (No localStorage!)
let inMemorySettings = { ...DEFAULT_SETTINGS };
let hasFetchedFromFirebase = false;
let activeUnsub = null;

function normalizeSettings(data) {
  if (!data || typeof data !== "object") return { ...DEFAULT_SETTINGS };
  return {
    ...DEFAULT_SETTINGS,
    ...data,
    workoutSlots: Array.isArray(data.workoutSlots) && data.workoutSlots.length > 0
      ? data.workoutSlots
      : DEFAULT_SETTINGS.workoutSlots
  };
}

/**
 * Synchronous getter returning current in-memory settings.
 * If not yet fetched from Firebase, triggers an initial fetch in the background.
 */
export function getGymSettings() {
  if (!hasFetchedFromFirebase) {
    fetchGymSettings("univo_main").catch(() => {});
  }
  return inMemorySettings;
}

/**
 * Fetch gym settings directly from Firebase Firestore
 */
export async function fetchGymSettings(gymId = "univo_main") {
  const targetGymId = gymId || "univo_main";
  try {
    const docRef = doc(db, "gyms", targetGymId, "settings", "general");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      inMemorySettings = normalizeSettings(snap.data());
      hasFetchedFromFirebase = true;
      return inMemorySettings;
    }

    // Fallback: check top-level gyms/{gymId} doc
    const gymDocRef = doc(db, "gyms", targetGymId);
    const gymSnap = await getDoc(gymDocRef);
    if (gymSnap.exists() && gymSnap.data()?.settings) {
      inMemorySettings = normalizeSettings(gymSnap.data().settings);
      hasFetchedFromFirebase = true;
      return inMemorySettings;
    }
  } catch (err) {
    console.warn("fetchGymSettings Firestore note:", err);
  }

  hasFetchedFromFirebase = true;
  return inMemorySettings;
}

/**
 * Subscribe to real-time Gym Settings updates from Firebase Firestore
 */
export function subscribeGymSettings(gymId = "univo_main", callback) {
  const targetGymId = gymId || "univo_main";
  if (activeUnsub) {
    activeUnsub();
    activeUnsub = null;
  }

  const docRef = doc(db, "gyms", targetGymId, "settings", "general");
  activeUnsub = onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      inMemorySettings = normalizeSettings(snap.data());
      hasFetchedFromFirebase = true;
      if (callback) callback(inMemorySettings);
    }
  }, (err) => {
    console.warn("subscribeGymSettings listener note:", err);
  });

  return activeUnsub;
}

/**
 * Save Gym Settings directly to Firebase Firestore
 */
export async function saveGymSettings(settings, gymId = "univo_main") {
  const targetGymId = gymId || "univo_main";
  const normalized = normalizeSettings(settings);
  inMemorySettings = normalized;

  try {
    const docRef = doc(db, "gyms", targetGymId, "settings", "general");
    await setDoc(docRef, {
      ...normalized,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Also update parent gym doc for broad compatibility
    try {
      const parentRef = doc(db, "gyms", targetGymId);
      await setDoc(parentRef, {
        name: normalized.gymName,
        phone: normalized.phone,
        address: normalized.address,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {}

    return true;
  } catch (err) {
    console.error("saveGymSettings Firestore error:", err);
    throw err;
  }
}

/**
 * Reset Gym Settings to defaults in Firebase Firestore
 */
export async function resetGymSettings(gymId = "univo_main") {
  const targetGymId = gymId || "univo_main";
  inMemorySettings = { ...DEFAULT_SETTINGS };

  try {
    const docRef = doc(db, "gyms", targetGymId, "settings", "general");
    await setDoc(docRef, {
      ...DEFAULT_SETTINGS,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn("resetGymSettings Firestore note:", err);
  }

  return DEFAULT_SETTINGS;
}

export { DEFAULT_SETTINGS };