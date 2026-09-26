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

export const DEFAULT_SERVICES = [
  {
    id: "s1",
    name: "Steam & Sauna Bath",
    category: "Recovery & Spa",
    price: 300,
    billingType: "Per Month",
    desc: "Muscle relaxation, detoxification and post-workout pore cleansing.",
    isActive: true,
  },
  {
    id: "s2",
    name: "Private Locker Bay",
    category: "Locker & Amenities",
    price: 500,
    billingType: "Per Month",
    desc: "Assigned personal locker for shoes, apparel, and gym accessories.",
    isActive: true,
  },
  {
    id: "s3",
    name: "Personal Diet Consultation",
    category: "Nutrition & Diet",
    price: 1200,
    billingType: "Per Month",
    desc: "Weekly personalized macro targets and customized Indian meal plan.",
    isActive: true,
  },
  {
    id: "s4",
    name: "Towel & Laundry Service",
    category: "Locker & Amenities",
    price: 400,
    billingType: "Per Month",
    desc: "Fresh sanitized gym and shower towels provided daily.",
    isActive: true,
  },
];

export async function getServices(gymId) {
  const GID = gymId || "univo_main";
  try {
    const q = query(
      collection(db, "gyms", GID, "services"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (list.length > 0) return list;
  } catch (err) {
    try {
      const snap2 = await getDocs(collection(db, "gyms", GID, "services"));
      const list2 = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (list2.length > 0) return list2;
    } catch (e) {}
  }
  return DEFAULT_SERVICES;
}

export async function addService(gymId, data) {
  const ref = collection(db, "gyms", gymId, "services");
  const docRef = await addDoc(ref, {
    ...data,
    isActive: data.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateService(gymId, serviceId, data) {
  const ref = doc(db, "gyms", gymId, "services", serviceId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteService(gymId, serviceId) {
  const ref = doc(db, "gyms", gymId, "services", serviceId);
  await deleteDoc(ref);
}

/**
 * Checks whether a gym service is included in a membership package for free
 */
export function isServiceIncludedInPlan(service, plan) {
  if (!service || !plan) return false;
  const srvName = (service.name || "").trim().toLowerCase();
  const srvId = service.id;

  // 1. Direct ID or Name check in plan.includedServices
  if (Array.isArray(plan.includedServices)) {
    if (plan.includedServices.includes(srvId) || plan.includedServices.includes(service.name)) {
      return true;
    }
    if (plan.includedServices.some((s) => typeof s === "string" && s.trim().toLowerCase() === srvName)) {
      return true;
    }
  }

  // 2. Check in plan.features (array of perk / service strings)
  if (Array.isArray(plan.features)) {
    return plan.features.some((feat) => {
      if (typeof feat !== "string") return false;
      const f = feat.trim().toLowerCase();
      // Exact match
      if (f === srvName) return true;
      // Key phrase matching e.g. "Steam & Sauna" in "Steam & Sauna Bath" or vice versa
      if (srvName.includes(f) || f.includes(srvName)) return true;
      // Common keywords for services (steam, sauna, locker, diet, laundry, bath, nutrition)
      if (srvName.includes("steam") && f.includes("steam")) return true;
      if (srvName.includes("sauna") && f.includes("sauna")) return true;
      if (srvName.includes("locker") && f.includes("locker")) return true;
      if (srvName.includes("diet") && (f.includes("diet") || f.includes("nutrition"))) return true;
      if (srvName.includes("laundry") && f.includes("laundry")) return true;
      return false;
    });
  }

  return false;
}

/**
 * Extracts number of duration months from a membership plan
 */
export function getPlanDurationMonths(plan) {
  if (!plan) return 1;

  // 1. Explicit durationMonths
  if (plan.durationMonths && Number(plan.durationMonths) > 0) {
    return Number(plan.durationMonths);
  }

  // 2. Explicit durationDays
  if (plan.durationDays && Number(plan.durationDays) > 0) {
    return Math.max(1, Math.round(Number(plan.durationDays) / 30));
  }

  // 3. durationUnit + duration
  const dUnit = (plan.durationUnit || '').toLowerCase();
  const durVal = Number(plan.duration);
  if (!isNaN(durVal) && durVal > 0) {
    if (dUnit.includes('year')) return durVal * 12;
    if (dUnit.includes('month')) return durVal;
    if (dUnit.includes('day')) return Math.max(1, Math.round(durVal / 30));
    // If unit is absent but number is >= 25, it's days (e.g. 30, 90, 180, 365)
    if (durVal >= 25) {
      return Math.max(1, Math.round(durVal / 30));
    }
    // If unit is absent and 1..24, it's months
    return durVal;
  }

  // 4. Text searching in name, duration, and durationUnit
  const str = `${plan.name || ''} ${plan.duration || ''} ${plan.durationUnit || ''}`.toLowerCase();
  if (str.includes("12 month") || str.includes("year") || str.includes("annual") || str.includes("365")) return 12;
  if (str.includes("6 month") || str.includes("180")) return 6;
  if (str.includes("3 month") || str.includes("quarter") || str.includes("90")) return 3;
  if (str.includes("2 month") || str.includes("60")) return 2;
  if (str.includes("1 month") || str.includes("monthly") || str.includes("30")) return 1;

  // 5. Regex pattern match for digit followed by month/mo
  const match = str.match(/(\d+)\s*(month|mo\b)/i);
  if (match && match[1]) {
    return Number(match[1]);
  }

  return 1;
}

/**
 * Computes service end date given start date and duration in months
 */
export function calculateServiceEndDate(startDate, months = 1) {
  const dt = startDate ? new Date(startDate) : new Date();
  const validMonths = Math.max(1, Number(months) || 1);
  dt.setMonth(dt.getMonth() + validMonths);
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  return `${year}-${month}-${day}`;
}
