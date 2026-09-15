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
