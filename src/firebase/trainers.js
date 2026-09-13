import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

export async function getTrainers(gymId) {
  const q = query(
    collection(db, "gyms", gymId, "trainers"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getTrainer(gymId, trainerId) {
  const ref = doc(db, "gyms", gymId, "trainers", trainerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function addTrainer(gymId, data) {
  const ref = collection(db, "gyms", gymId, "trainers");
  const docRef = await addDoc(ref, {
    ...data,
    memberCount: 0,
    rating: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateTrainer(gymId, trainerId, data) {
  const ref = doc(db, "gyms", gymId, "trainers", trainerId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteTrainer(gymId, trainerId) {
  const ref = doc(db, "gyms", gymId, "trainers", trainerId);
  await deleteDoc(ref);
}

export async function getTrainerMembers(gymId, trainerId, trainerName = "") {
  try {
    let allMembers = [];
    try {
      const snap1 = await getDocs(collection(db, "members"));
      allMembers = snap1.docs.map((d) => ({ ...d.data(), id: d.id }));
    } catch (e) {
      // fallback
    }

    if (allMembers.length === 0) {
      try {
        const colRef = collection(db, "gyms", gymId || "univo_main", "members");
        const snap2 = await getDocs(colRef);
        allMembers = snap2.docs.map((d) => ({ ...d.data(), id: d.id }));
      } catch (e2) {
        // fallback
      }
    }

    // Merge with local cache
    try {
      const cached = JSON.parse(localStorage.getItem("univo_recent_members") || "[]");
      const ids = new Set(allMembers.map(m => m.id));
      for (const c of cached) {
        if (!ids.has(c.id)) allMembers.push(c);
      }
    } catch (cErr) {}

    return allMembers.filter((m) => {
      if (trainerId && (m.trainerId === trainerId || m.coachId === trainerId)) return true;
      if (trainerName && m.trainerName && (m.trainerName.toLowerCase() === trainerName.toLowerCase() || m.trainerName.toLowerCase().includes(trainerName.toLowerCase()))) return true;
      return false;
    });
  } catch (err) {
    console.error("Error in getTrainerMembers:", err);
    return [];
  }
}

export async function saveMemberDietPlan(gymId, memberId, dietPlan) {
  const ref = doc(db, "gyms", gymId || "univo_main", "members", memberId);
  await updateDoc(ref, {
    dietPlan,
    dietPlanUpdatedAt: serverTimestamp(),
  });
}

export async function logMemberWeight(gymId, memberId, weightEntry) {
  const ref = doc(db, "gyms", gymId || "univo_main", "members", memberId);
  const snap = await getDoc(ref);
  const existingHistory = snap.exists() && Array.isArray(snap.data().weightHistory) ? snap.data().weightHistory : [];
  
  await updateDoc(ref, {
    weight: Number(weightEntry.weight),
    weightHistory: [
      {
        id: Date.now().toString(),
        weight: Number(weightEntry.weight),
        date: weightEntry.date || new Date().toISOString().split("T")[0],
        note: weightEntry.note || "",
        recordedAt: new Date().toISOString(),
      },
      ...existingHistory,
    ],
    updatedAt: serverTimestamp(),
  });
}

export async function recordTrainerSessionCompleted(gymId, memberId) {
  const ref = doc(db, "gyms", gymId || "univo_main", "members", memberId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const cur = Number(snap.data().ptCompletedSessions || 0);
    await updateDoc(ref, {
      ptCompletedSessions: cur + 1,
      lastSessionDate: new Date().toISOString().split("T")[0],
      updatedAt: serverTimestamp(),
    });
    return cur + 1;
  }
  return 1;
}

export async function getTrainerBeforeAfter(gymId, trainerId) {
  const q = query(
    collection(db, "gyms", gymId, "beforeAfter"),
    where("trainerId", "==", trainerId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getTrainerPlans(gymId, trainerId) {
  const q = query(
    collection(db, "gyms", gymId, "workoutPlans"),
    where("trainerId", "==", trainerId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getBeforeAfterByTrainer(gymId, trainerId) {
  return await getTrainerBeforeAfter(gymId, trainerId);
}

