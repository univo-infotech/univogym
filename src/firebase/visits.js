import { collection, addDoc, updateDoc, doc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "./config";
import { getCachedData, setCachedData } from "../utils/dataCache";

export async function addVisit(gymId, visitData) {
  const colRef = collection(db, `gyms/${gymId}/visits`);
  return await addDoc(colRef, {
    ...visitData,
    createdAt: new Date().toISOString()
  });
}

export async function updateVisit(gymId, visitId, data) {
  const docRef = doc(db, `gyms/${gymId}/visits`, visitId);
  return await updateDoc(docRef, data);
}

export async function getVisits(gymId, forceRefresh = false) {
  const targetGymId = gymId || "univo_main";
  const cacheKey = `visits_${targetGymId}`;

  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached && cached.isFresh) {
      return cached.data;
    }
  }

  try {
    const colRef = collection(db, `gyms/${targetGymId}/visits`);
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setCachedData(cacheKey, list);
    return list;
  } catch (e) {
    console.warn("getVisits error:", e);
    return [];
  }
}

export async function deleteVisit(gymId, visitId) {
  const docRef = doc(db, `gyms/${gymId}/visits`, visitId);
  return await deleteDoc(docRef);
}

export async function convertVisitToMember(gymId, visitId, memberId) {
  const docRef = doc(db, `gyms/${gymId}/visits`, visitId);
  return await updateDoc(docRef, {
    status: "converted",
    convertedMemberId: memberId,
    convertedAt: new Date().toISOString()
  });
}
