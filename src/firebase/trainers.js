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
  const list = [];
  const seenIds = new Set();

  // 1. Top-level trainers collection
  try {
    const snap1 = await getDocs(collection(db, "trainers"));
    snap1.docs.forEach((d) => {
      seenIds.add(d.id);
      list.push({ id: d.id, ...d.data() });
    });
  } catch (e) {
    console.warn("Top-level trainers fetch error:", e);
  }

  // 2. Gym sub-collection gyms/{gymId}/trainers
  try {
    const snap2 = await getDocs(collection(db, "gyms", gymId || "univo_main", "trainers"));
    snap2.docs.forEach((d) => {
      if (!seenIds.has(d.id)) {
        seenIds.add(d.id);
        list.push({ id: d.id, ...d.data() });
      } else {
        const idx = list.findIndex((x) => x.id === d.id);
        if (idx >= 0) list[idx] = { ...list[idx], ...d.data() };
      }
    });
  } catch (e2) {
    console.warn("Sub-collection trainers fetch error:", e2);
  }

  return list;
}

export async function getTrainer(gymId, trainerId) {
  if (!trainerId) return null;
  // 1. Check top-level
  try {
    const snap1 = await getDoc(doc(db, "trainers", trainerId));
    if (snap1.exists()) return { id: snap1.id, ...snap1.data() };
  } catch (e) {}

  // 2. Check sub-collection
  try {
    const snap2 = await getDoc(doc(db, "gyms", gymId || "univo_main", "trainers", trainerId));
    if (snap2.exists()) return { id: snap2.id, ...snap2.data() };
  } catch (e2) {}

  return null;
}

export async function addTrainer(gymId, data) {
  const GID = gymId || "univo_main";
  const payload = {
    ...data,
    memberCount: 0,
    rating: 5,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Add to top-level trainers
  let docId = "";
  try {
    const ref1 = collection(db, "trainers");
    const res1 = await addDoc(ref1, payload);
    docId = res1.id;
  } catch (e) {}

  // Also sync to sub-collection
  try {
    if (docId) {
      await updateDoc(doc(db, "gyms", GID, "trainers", docId), payload).catch(() => {});
    } else {
      const ref2 = collection(db, "gyms", GID, "trainers");
      const res2 = await addDoc(ref2, payload);
      docId = res2.id;
    }
  } catch (e2) {}

  return docId;
}

export async function updateTrainer(gymId, trainerId, data) {
  const GID = gymId || "univo_main";
  const payload = { ...data, updatedAt: serverTimestamp() };

  // Update top-level trainers
  try {
    await updateDoc(doc(db, "trainers", trainerId), payload);
  } catch (e) {
    try {
      const { setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "trainers", trainerId), payload, { merge: true });
    } catch (e2) {}
  }

  // Update sub-collection
  try {
    await updateDoc(doc(db, "gyms", GID, "trainers", trainerId), payload);
  } catch (e3) {
    try {
      const { setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "gyms", GID, "trainers", trainerId), payload, { merge: true });
    } catch (e4) {}
  }
}

export async function deleteTrainer(gymId, trainerId) {
  const GID = gymId || "univo_main";
  try {
    await deleteDoc(doc(db, "trainers", trainerId));
  } catch (e) {}
  try {
    await deleteDoc(doc(db, "gyms", GID, "trainers", trainerId));
  } catch (e2) {}
}

export async function getTrainerMembers(gymId, trainerId, trainerName = "") {
  try {
    let allMembers = [];
    const seenIds = new Set();

    // 1. Fetch from top-level members
    try {
      const snap1 = await getDocs(collection(db, "members"));
      snap1.docs.forEach((d) => {
        seenIds.add(d.id);
        allMembers.push({ id: d.id, ...d.data() });
      });
    } catch (e) {}

    // 2. Fetch from gyms/{gymId}/members
    try {
      const snap2 = await getDocs(collection(db, "gyms", gymId || "univo_main", "members"));
      snap2.docs.forEach((d) => {
        if (!seenIds.has(d.id)) {
          seenIds.add(d.id);
          allMembers.push({ id: d.id, ...d.data() });
        } else {
          const idx = allMembers.findIndex((x) => x.id === d.id);
          if (idx >= 0) allMembers[idx] = { ...allMembers[idx], ...d.data() };
        }
      });
    } catch (e2) {}

    // 3. Merge with local cache if any
    try {
      const cached = JSON.parse(localStorage.getItem("univo_recent_members") || "[]");
      for (const c of cached) {
        if (!seenIds.has(c.id)) {
          seenIds.add(c.id);
          allMembers.push(c);
        }
      }
    } catch (cErr) {}

    const targetTId = (trainerId || "").trim();
    const targetName = (trainerName || "").trim().toLowerCase();

    return allMembers.filter((m) => {
      const mTrainerId = (m.trainerId || m.coachId || "").trim();
      const mTrainerName = (
        m.personalTrainer ||
        m.trainerName ||
        m.trainer ||
        m.assignedTrainer ||
        ""
      ).trim().toLowerCase();

      // Check ID match
      if (targetTId && mTrainerId && mTrainerId === targetTId) return true;

      // Check Name match
      if (targetName && mTrainerName) {
        if (
          mTrainerName === targetName ||
          mTrainerName.includes(targetName) ||
          targetName.includes(mTrainerName)
        ) {
          return true;
        }
      }

      // If member has personal trainer assigned and targetName is present
      if (m.ptPlanName || m.ptPlanPrice) {
        if (targetName && mTrainerName && (mTrainerName.includes(targetName) || targetName.includes(mTrainerName))) {
          return true;
        }
      }

      return false;
    });
  } catch (err) {
    console.error("Error in getTrainerMembers:", err);
    return [];
  }
}

export async function saveMemberDietPlan(gymId, memberId, dietPlan) {
  const GID = gymId || "univo_main";
  const updatePayload = {
    dietPlan,
    dietPlanUpdatedAt: serverTimestamp(),
  };

  // 1. Update top-level collection 'members'
  try {
    const ref1 = doc(db, "members", memberId);
    await updateDoc(ref1, updatePayload);
  } catch (e1) {
    try {
      const q = query(collection(db, "members"), where("id", "==", memberId));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        await updateDoc(doc(db, "members", qSnap.docs[0].id), updatePayload);
      }
    } catch (e1b) {}
  }

  // 2. Update nested collection 'gyms/{gymId}/members'
  try {
    const ref2 = doc(db, "gyms", GID, "members", memberId);
    await updateDoc(ref2, updatePayload);
  } catch (e2) {}

  // 3. Update in univo_recent_members local cache
  try {
    const cached = JSON.parse(localStorage.getItem("univo_recent_members") || "[]");
    const idx = cached.findIndex((m) => m.id === memberId);
    if (idx !== -1) {
      cached[idx] = { ...cached[idx], dietPlan, dietPlanUpdatedAt: new Date().toISOString() };
      localStorage.setItem("univo_recent_members", JSON.stringify(cached));
    }
  } catch (e3) {}

  // 4. Update in univo_member_session if active logged-in member matches
  try {
    const sessionStr = localStorage.getItem("univo_member_session");
    if (sessionStr) {
      const sess = JSON.parse(sessionStr);
      if (sess.id === memberId) {
        localStorage.setItem(
          "univo_member_session",
          JSON.stringify({ ...sess, dietPlan, dietPlanUpdatedAt: new Date().toISOString() })
        );
      }
    }
  } catch (e4) {}
}

export async function saveMemberWorkoutRoutine(gymId, memberId, workoutRoutine) {
  const GID = gymId || "univo_main";
  const updatePayload = {
    workoutRoutine,
    workoutRoutineUpdatedAt: serverTimestamp(),
  };

  // 1. Update top-level collection 'members'
  try {
    const ref1 = doc(db, "members", memberId);
    await updateDoc(ref1, updatePayload);
  } catch (e1) {
    try {
      const q = query(collection(db, "members"), where("id", "==", memberId));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        await updateDoc(doc(db, "members", qSnap.docs[0].id), updatePayload);
      }
    } catch (e1b) {}
  }

  // 2. Update nested collection 'gyms/{gymId}/members'
  try {
    const ref2 = doc(db, "gyms", GID, "members", memberId);
    await updateDoc(ref2, updatePayload);
  } catch (e2) {}

  // 3. Update in univo_recent_members local cache
  try {
    const cached = JSON.parse(localStorage.getItem("univo_recent_members") || "[]");
    const idx = cached.findIndex((m) => m.id === memberId);
    if (idx !== -1) {
      cached[idx] = { ...cached[idx], workoutRoutine, workoutRoutineUpdatedAt: new Date().toISOString() };
      localStorage.setItem("univo_recent_members", JSON.stringify(cached));
    }
  } catch (e3) {}

  // 4. Update in univo_member_session if active logged-in member matches
  try {
    const sessionStr = localStorage.getItem("univo_member_session");
    if (sessionStr) {
      const sess = JSON.parse(sessionStr);
      if (sess.id === memberId) {
        localStorage.setItem(
          "univo_member_session",
          JSON.stringify({ ...sess, workoutRoutine, workoutRoutineUpdatedAt: new Date().toISOString() })
        );
      }
    }
  } catch (e4) {}
}

export async function logMemberWeight(gymId, memberId, weightEntry) {
  const GID = gymId || "univo_main";
  let existingHistory = [];
  
  try {
    const snap1 = await getDoc(doc(db, "members", memberId));
    if (snap1.exists() && Array.isArray(snap1.data().weightHistory)) {
      existingHistory = snap1.data().weightHistory;
    } else {
      const snap2 = await getDoc(doc(db, "gyms", GID, "members", memberId));
      if (snap2.exists() && Array.isArray(snap2.data().weightHistory)) {
        existingHistory = snap2.data().weightHistory;
      }
    }
  } catch (e) {}

  const newHistory = [
    {
      id: Date.now().toString(),
      weight: Number(weightEntry.weight),
      date: weightEntry.date || new Date().toISOString().split("T")[0],
      note: weightEntry.note || "",
      recordedAt: new Date().toISOString(),
    },
    ...existingHistory,
  ];

  const updatePayload = {
    weight: Number(weightEntry.weight),
    weightHistory: newHistory,
    updatedAt: serverTimestamp(),
  };

  // 1. Update top-level collection 'members'
  try {
    await updateDoc(doc(db, "members", memberId), updatePayload);
  } catch (e1) {
    try {
      const q = query(collection(db, "members"), where("id", "==", memberId));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        await updateDoc(doc(db, "members", qSnap.docs[0].id), updatePayload);
      }
    } catch (e1b) {}
  }

  // 2. Update nested collection 'gyms/{gymId}/members'
  try {
    await updateDoc(doc(db, "gyms", GID, "members", memberId), updatePayload);
  } catch (e2) {}

  // 3. Update in univo_recent_members local cache
  try {
    const cached = JSON.parse(localStorage.getItem("univo_recent_members") || "[]");
    const idx = cached.findIndex((m) => m.id === memberId);
    if (idx !== -1) {
      cached[idx] = { ...cached[idx], weight: Number(weightEntry.weight), weightHistory: newHistory };
      localStorage.setItem("univo_recent_members", JSON.stringify(cached));
    }
  } catch (e3) {}

  // 4. Update in univo_member_session
  try {
    const sessionStr = localStorage.getItem("univo_member_session");
    if (sessionStr) {
      const sess = JSON.parse(sessionStr);
      if (sess.id === memberId) {
        localStorage.setItem(
          "univo_member_session",
          JSON.stringify({ ...sess, weight: Number(weightEntry.weight), weightHistory: newHistory })
        );
      }
    }
  } catch (e4) {}
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

