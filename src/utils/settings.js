import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

// Default Gym Settings
const DEFAULT_SETTINGS = {
  gymName: "UNIVO GYM MANAGEMENT",
  tagline: "Stronger Today, Healthier Tomorrow",
  phone: "+91 9196302375",
  address: "Main Branch, Univo Fitness Centre",
  whatsappWelcome: "💪 *Welcome to {gym_name}!*\n\nHi {name},\nYour membership for *{plan}* has been successfully activated.\n\nThank you for choosing us! Let's get stronger together! 🔥",
  whatsappReminder: "⚠️ *Gym Membership Ending Soon - {gym_name}*\n\nHi {name},\nYour membership for *{plan}* is ending {days_left} (on *{expiry}*).\nRenewal Amount: ₹{amount}.\n\nRenew today to maintain your workout consistency without disruption! 💪🔥\n— {gym_name}",
  whatsappPtReminder: "✨ *Personal Training (PT) Ending Soon - {gym_name}*\n\nHi {name},\nYour 1-on-1 Personal Training package with *Coach {trainer}* ({plan}) is ending {days_left} (on *{expiry}*).\nRenewal Amount: ₹{amount}.\n\nRenew your PT package today to keep achieving your personal transformation goals! 🎯🔥\n— {gym_name}",
  whatsappExpired: "🚨 *Gym Membership Expired - {gym_name}*\n\nHi {name},\nYour gym membership for *{plan}* has expired {days_expired} (on *{expiry}*).\nRenewal Amount: ₹{amount}.\n\nRenew your membership today to restart your workout sessions and keep your fitness journey going! 💪🔥\n— {gym_name}",
  whatsappPtExpired: "🚨 *Personal Training (PT) Expired - {gym_name}*\n\nHi {name},\nYour 1-on-1 Personal Training package with *Coach {trainer}* ({plan}) has expired {days_expired} (on *{expiry}*).\nRenewal Amount: ₹{amount}.\n\nPlease renew your PT package today so you don't miss your training slots with Coach {trainer}! 🎯🔥\n— {gym_name}",
  whatsappOverdue: "⛔ *Membership Overdue Notice - {gym_name}*\n\nHi {name},\nYour gym membership for *{plan}* has ended and is now *{days_overdue} overdue* (ended on *{expiry}*).\nOutstanding Renewal Amount: ₹{amount}.\n\nPlease clear your renewal today at the reception or via UPI to reactivate your access! 🔥\n— {gym_name}",
  whatsappPtOverdue: "⛔ *Personal Training (PT) Overdue Notice - {gym_name}*\n\nHi {name},\nYour 1-on-1 Personal Training package with *Coach {trainer}* ({plan}) is now *{days_overdue} overdue*.\nRenewal Amount: ₹{amount}.\n\nPlease renew today at the gym desk to secure your coaching slot with Coach {trainer}! 🎯🔥\n— {gym_name}",
  whatsappPartialDue: "⚠️ *Payment Reminder - {gym_name}*\n\nHi {name},\nThis is a friendly reminder regarding your pending fee balance for *{plan}*.\n\n💰 *Remaining Due: ₹{amount}*\n\nPlease clear your balance at the gym reception or via UPI.\nThank you! Keep training hard! 💪\n— {gym_name}",
  whatsappReceipt: "🧾 *Payment Receipt - {gym_name}*\n\nMember: {name}\nPlan: {plan}\nPaid Amount: ₹{amount}\nDate: {date}\n\nThank you for training with us! Keep crushing your workouts! 💪",
  whatsappInvite: "💪 *Welcome to {gym_name}!*\n\nPlease complete your membership registration form, photo upload & liability waiver using this direct link:\n\n🔗 {link}\n\n⚠️ *Important:* This secure registration link expires in 10 minutes.\nLet's get stronger together! 🔥",
  whatsappBirthday: "🎂 *Happy Birthday, {name}!* 🎉\n\nWishing you a fantastic year of strength, good health, and fitness gains! Have a wonderful day ahead! 💪✨\n— Team {gym_name}",
  whatsappDemoEndingToday: "⏳ *Demo Session Ending Today - {gym_name}*\n\nHi {name}!\nYour free trial workout / demo session at *{gym_name}* is ending today!\n\nWe hope you had a great workout experience with us. Enroll today to take advantage of our exclusive member joining discount! 💪🔥\n— {gym_name}",
  whatsappDemoEnded: "🎯 *Demo Session Completed - {gym_name}*\n\nHi {name}!\nYour demo trial session at *{gym_name}* has ended.\n\nDon't let your fitness momentum break! Join our gym family today and start your journey towards your fitness goal ({plan}). Reply here to secure your special joining offer! 💪🔥\n— {gym_name}",
  whatsappVisitFollowup: "👋 *Hello {name}! - {gym_name}*\n\nThank you for visiting us! We would love to have you as part of our fitness family.\n\nSpecial joining offers are active this week for *{plan}*. Feel free to reply here if you have any questions! 🔥",
  whatsappMemberLogin: "🏋️ *Member Portal Login Credentials - {gym_name}*\n\nHi {name},\nHere are your member portal login credentials:\n\n📱 *Login Phone / ID:* {phone}\n🔑 *Password:* {password}\n🔗 *Portal Link:* {link}\n\nLog in anytime to view your plan validity, attendance record, and workout progress! 💪🔥\n— {gym_name}",
  whatsappExtension: "📅 *Gym Membership Extended - {gym_name}*\n\nHello {name},\nYour gym membership has been extended by *+{extra_days} Days*!\n\n🗓️ *New Expiry Date:* {expiry}\n💰 *Extension Fee:* ₹{amount} ({mode})\n\nKeep up the fitness consistency! Stay active and fit! 💪🔥\n— {gym_name}",
  whatsappPtInvoice: "🧾 *Official Personal Training (PT) Receipt - {gym_name}*\n\nHello {name},\nCongratulations on enrolling in 1-on-1 Personal Training with *Coach {trainer}* ({plan})!\n\n📅 *Validity:* Valid till {expiry} ({duration} Days)\n💰 *Total PT Fee:* ₹{amount}\n✅ *Amount Paid:* ₹{paid}\n{due_text}\n\nDedicated coaching brings extraordinary results! Keep training hard! 🎯🔥\n— {gym_name}",
  whatsappServiceInvoice: "🧾 *Official Facility Service Invoice - {gym_name}*\n\nHello {name},\nYour gym facility subscription for *{service}* ({category}) is now active!\n\n📅 *Valid Till:* {expiry} ({duration})\n💰 *Total Service Fee:* ₹{amount}\n✅ *Amount Paid:* ₹{paid}\n{due_text}\n\nEnjoy your premium gym facilities! 💪✨\n— {gym_name}",
  whatsappSupplementInvoice: "🧾 *Store Tax Invoice & Bill - {gym_name}*\n\nDear {name},\nThank you for purchasing fitness products from our Gym Store:\n\n📦 *Product:* {item} ({brand})\n🔢 *Quantity:* {quantity}\n💰 *Total Paid:* ₹{amount} ({mode})\n📅 *Date:* {date}\n\nStay fit, healthy, and fueled for your workouts! 🔥💪\n— {gym_name}",
  whatsappInactive: "🔥 *We Miss You at the Gym! - {gym_name}*\n\nHi {name},\nWe noticed that you haven't checked in for your workouts in the past *{days_absent} days*!\n\nConsistency is the key to achieving your fitness goals with *{plan}*. Come in today for an energizing workout session! 💪🔥\n— Team {gym_name}",
  ownerSignatureName: "Authorized Signatory",
  ownerSignatureTitle: "Gym Manager / Owner",
  logoUrl: "/logo-icon.png",
  signatureUrl: "",
  workoutSlots: [
    { id: "morning", label: "Morning", time: "6:00 AM - 9:00 AM", iconName: "Sun" },
    { id: "afternoon", label: "Afternoon", time: "12:00 PM - 3:00 PM", iconName: "Sun" },
    { id: "evening", label: "Evening", time: "4:00 PM - 7:00 PM", iconName: "Sunset" },
    { id: "night", label: "Night", time: "7:00 PM - 10:00 PM", iconName: "Moon" }
  ],
  dashboardLayout: {
    sectionsOrder: [
      "banner",
      "quick_jump",
      "kpi_stats",
      "pnl_strip",
      "charts_row",
      "urgent_renewals",
      "pending_dues",
      "today_attendance",
      "today_demos",
      "recent_payments",
      "recent_members",
      "equipment_status"
    ],
    visibleSections: {
      banner: true,
      quick_jump: true,
      kpi_stats: true,
      pnl_strip: true,
      charts_row: true,
      urgent_renewals: true,
      pending_dues: true,
      today_attendance: true,
      today_demos: true,
      recent_payments: true,
      recent_members: true,
      equipment_status: true
    },
    visibleKpis: {
      active_members: true,
      net_revenue: true,
      today_collection: true,
      renewals_due: true,
      pending_dues: true,
      today_punches: true,
      walkins: true
    }
  }
};

// In-memory runtime cache (No localStorage!)
let inMemorySettings = { ...DEFAULT_SETTINGS };
let hasFetchedFromFirebase = false;
let activeUnsub = null;

function normalizeSettings(data) {
  if (!data || typeof data !== "object") return { ...DEFAULT_SETTINGS };
  const incomingOrder = Array.isArray(data.dashboardLayout?.sectionsOrder) && data.dashboardLayout.sectionsOrder.length > 0
    ? [...data.dashboardLayout.sectionsOrder]
    : [...DEFAULT_SETTINGS.dashboardLayout.sectionsOrder];
  
  // Merge any new default sections that don't exist in saved order yet
  DEFAULT_SETTINGS.dashboardLayout.sectionsOrder.forEach((secId) => {
    if (!incomingOrder.includes(secId)) {
      incomingOrder.push(secId);
    }
  });

  return {
    ...DEFAULT_SETTINGS,
    ...data,
    workoutSlots: Array.isArray(data.workoutSlots) && data.workoutSlots.length > 0
      ? data.workoutSlots
      : DEFAULT_SETTINGS.workoutSlots,
    dashboardLayout: {
      sectionsOrder: incomingOrder,
      visibleSections: typeof data.dashboardLayout?.visibleSections === "object" && data.dashboardLayout?.visibleSections !== null
        ? { ...DEFAULT_SETTINGS.dashboardLayout.visibleSections, ...data.dashboardLayout.visibleSections }
        : DEFAULT_SETTINGS.dashboardLayout.visibleSections,
      visibleKpis: typeof data.dashboardLayout?.visibleKpis === "object" && data.dashboardLayout?.visibleKpis !== null
        ? { ...DEFAULT_SETTINGS.dashboardLayout.visibleKpis, ...data.dashboardLayout.visibleKpis }
        : DEFAULT_SETTINGS.dashboardLayout.visibleKpis
    }
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