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
} from "firebase/firestore";
import { db } from "./config";
import { getCachedData, setCachedData, invalidateCache } from "../utils/dataCache";

export const DEFAULT_OFFERS = [
  {
    id: "off_festival",
    title: "Festival Dhamaka Season Pass",
    discountType: "percentage",
    discountValue: 25,
    discountBadge: "25% FLAT OFF",
    promoCode: "FESTIVAL25",
    planTarget: "All 6-Month & Annual Plans",
    validTill: "2026-10-31",
    description: "Special seasonal festival discount! Get 25% off on half-yearly & annual fitness subscriptions with complimentary BMI body composition audit.",
    bannerUrl: "",
    isActive: true,
    terms: ["Applicable on new admissions & renewals", "Cannot be clubbed with other promos", "Valid for first 50 members"],
    memberCountClaimed: 18,
    createdAt: new Date().toISOString()
  },
  {
    id: "off_buddy",
    title: "Buddy Transformation Duo",
    discountType: "bogo",
    discountValue: 50,
    discountBadge: "Buy 1 Get 1 @ 50% OFF",
    promoCode: "BUDDY50",
    planTarget: "Quarterly & Half-Yearly Plans",
    validTill: "2026-11-15",
    description: "Workout with your gym bro or partner! Register together and your partner gets 50% flat discount on their membership.",
    bannerUrl: "",
    isActive: true,
    terms: ["Both members must register on same day", "Same plan duration required"],
    memberCountClaimed: 9,
    createdAt: new Date().toISOString()
  },
  {
    id: "off_winback",
    title: "Welcome Back Renewal Pass",
    discountType: "flat",
    discountValue: 1000,
    discountBadge: "Flat ₹1,000 Cash OFF",
    promoCode: "COMEBACK1K",
    planTarget: "Any Membership Package",
    validTill: "2026-12-31",
    description: "Exclusive win-back offer for our valued past members! Restart your fitness streak today and save flat ₹1,000 on your renewal invoice.",
    bannerUrl: "",
    isActive: true,
    terms: ["Valid only for expired / lapsed members", "Zero re-admission fee"],
    memberCountClaimed: 14,
    createdAt: new Date().toISOString()
  },
  {
    id: "off_student",
    title: "Student Power Fitness Pass",
    discountType: "percentage",
    discountValue: 30,
    discountBadge: "30% Student Discount",
    promoCode: "CAMPUS30",
    planTarget: "3-Month & 6-Month Plans",
    validTill: "2026-12-31",
    description: "Special youth & university student discount. Build strength and stay athletic with 30% discount on producing valid student college ID.",
    bannerUrl: "",
    isActive: true,
    terms: ["Valid Student ID card mandatory at desk", "Age limit up to 25 years"],
    memberCountClaimed: 27,
    createdAt: new Date().toISOString()
  }
];

export async function getOffers(gymId, forceRefresh = false) {
  const targetGymId = gymId || "univo_main";
  const cacheKey = `offers_${targetGymId}`;

  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached && cached.isFresh) {
      return cached.data;
    }
  }

  try {
    const colRef = collection(db, "gyms", targetGymId, "offers");
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setCachedData(cacheKey, list);
      return list;
    }
  } catch (err) {
    console.warn("getOffers Firestore note:", err);
  }

  // Fallback to local default offers
  setCachedData(cacheKey, DEFAULT_OFFERS);
  return DEFAULT_OFFERS;
}

export async function addOffer(gymId, offerData) {
  const targetGymId = gymId || "univo_main";
  try {
    const colRef = collection(db, "gyms", targetGymId, "offers");
    const docRef = await addDoc(colRef, {
      ...offerData,
      createdAt: new Date().toISOString(),
      updatedAt: serverTimestamp()
    });
    invalidateCache(`offers_${targetGymId}`);
    return { id: docRef.id, ...offerData };
  } catch (err) {
    console.error("addOffer error:", err);
    invalidateCache(`offers_${targetGymId}`);
    return { id: "off_" + Date.now(), ...offerData, createdAt: new Date().toISOString() };
  }
}

export async function updateOffer(gymId, offerId, data) {
  const targetGymId = gymId || "univo_main";
  try {
    const docRef = doc(db, "gyms", targetGymId, "offers", offerId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn("updateOffer local note:", err);
  }
  invalidateCache(`offers_${targetGymId}`);
}

export async function deleteOffer(gymId, offerId) {
  const targetGymId = gymId || "univo_main";
  try {
    const docRef = doc(db, "gyms", targetGymId, "offers", offerId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("deleteOffer local note:", err);
  }
  invalidateCache(`offers_${targetGymId}`);
}

export async function getBroadcastLogs(gymId, forceRefresh = false) {
  const targetGymId = gymId || "univo_main";
  const cacheKey = `broadcast_logs_${targetGymId}`;

  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached && cached.isFresh) {
      return cached.data;
    }
  }

  try {
    const colRef = collection(db, "gyms", targetGymId, "broadcasts");
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0));
      setCachedData(cacheKey, list);
      return list;
    }
  } catch (err) {
    console.warn("getBroadcastLogs note:", err);
  }

  return [];
}

export async function addBroadcastLog(gymId, logData) {
  const targetGymId = gymId || "univo_main";
  try {
    const colRef = collection(db, "gyms", targetGymId, "broadcasts");
    const docRef = await addDoc(colRef, {
      ...logData,
      sentAt: new Date().toISOString(),
      timestamp: serverTimestamp()
    });
    invalidateCache(`broadcast_logs_${targetGymId}`);
    return { id: docRef.id, ...logData };
  } catch (err) {
    console.error("addBroadcastLog error:", err);
    invalidateCache(`broadcast_logs_${targetGymId}`);
    return { id: "bcast_" + Date.now(), ...logData, sentAt: new Date().toISOString() };
  }
}
