import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";
import { getCachedData, setCachedData, invalidateCache } from "../utils/dataCache";

/**
 * Helper to get local trainers cache
 */
export function getLocalTrainers() {
  try {
    const raw = localStorage.getItem("univo_recent_trainers");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Helper to save local trainers cache
 */
export function saveLocalTrainer(trainer) {
  try {
    const list = getLocalTrainers();
    const filtered = list.filter((t) => t.id !== trainer.id && (t.phone && trainer.phone ? t.phone !== trainer.phone : true));
    localStorage.setItem("univo_recent_trainers", JSON.stringify([trainer, ...filtered].slice(0, 100)));
  } catch (e) {
    console.warn("Could not save to local trainers cache:", e);
  }
}

/**
 * Helper to remove from local trainers cache
 */
export function removeLocalTrainer(trainerId) {
  try {
    const list = getLocalTrainers().filter((t) => t.id !== trainerId);
    localStorage.setItem("univo_recent_trainers", JSON.stringify(list));
  } catch (e) {
    console.warn("Could not remove from local trainers cache:", e);
  }
}

export async function getTrainers(gymId, forceRefresh = false) {
  const targetGymId = gymId || "univo_main";
  const cacheKey = `trainers_${targetGymId}`;

  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached && cached.isFresh && Array.isArray(cached.data) && cached.data.length > 0) {
      return cached.data;
    }
  }

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
    const snap2 = await getDocs(collection(db, "gyms", targetGymId, "trainers"));
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

  // 3. Merge with locally persisted trainers (guarantees newly added trainer is NEVER lost)
  try {
    const local = getLocalTrainers();
    if (Array.isArray(local) && local.length > 0) {
      for (const lt of local) {
        if (!seenIds.has(lt.id)) {
          seenIds.add(lt.id);
          list.unshift(lt);
        } else {
          const idx = list.findIndex((x) => x.id === lt.id);
          if (idx >= 0) list[idx] = { ...list[idx], ...lt };
        }
      }
    }
  } catch (lErr) {
    console.warn("Local trainer merge notice:", lErr);
  }

  setCachedData(cacheKey, list);
  return list;
}

export async function getTrainer(gymId, trainerId) {
  if (!trainerId) return null;
  // 1. Check local cache first for instant lookup
  const local = getLocalTrainers().find((t) => t.id === trainerId);
  if (local) return local;

  // 2. Check top-level
  try {
    const snap1 = await getDoc(doc(db, "trainers", trainerId));
    if (snap1.exists()) return { id: snap1.id, ...snap1.data() };
  } catch (e) {}

  // 3. Check sub-collection
  try {
    const snap2 = await getDoc(doc(db, "gyms", gymId || "univo_main", "trainers", trainerId));
    if (snap2.exists()) return { id: snap2.id, ...snap2.data() };
  } catch (e2) {}

  return null;
}

export async function addTrainer(gymId, data) {
  const GID = gymId || "univo_main";
  const nowIso = new Date().toISOString();
  const docId = data.id || `tr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  const payload = {
    ...data,
    id: docId,
    gymId: GID,
    memberCount: data.memberCount || 0,
    rating: data.rating || 5,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // 1. Immediately save to local storage & invalidate cache so all sections see it with 0ms lag
  saveLocalTrainer(payload);
  invalidateCache("trainers");

  // 2. Add to top-level trainers collection
  try {
    await setDoc(doc(db, "trainers", docId), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (e1) {
    console.warn("Error saving to top-level trainers collection:", e1);
  }

  // 3. Add to gym sub-collection
  try {
    await setDoc(doc(db, "gyms", GID, "trainers", docId), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (e2) {
    console.warn("Error saving to gym sub-collection:", e2);
  }

  // 4. Create user account document in users collection so trainer can log in
  if (data.email || data.loginEmail) {
    try {
      const email = data.email || data.loginEmail;
      const password = data.password || data.loginPassword || "Coach@123";
      await setDoc(doc(db, "users", docId), {
        email,
        password,
        role: "trainer",
        gymId: GID,
        name: data.name || data.fullName,
        profileId: docId,
        status: "active",
        createdAt: nowIso
      }, { merge: true });
    } catch (uErr) {
      console.warn("Could not create user auth document for trainer:", uErr);
    }
  }

  return docId;
}

export async function updateTrainer(gymId, trainerId, data) {
  const GID = gymId || "univo_main";
  const nowIso = new Date().toISOString();
  const payload = { ...data, updatedAt: nowIso };

  // 1. Update local cache immediately
  const localList = getLocalTrainers();
  const updatedLocal = localList.map((t) => (t.id === trainerId ? { ...t, ...payload } : t));
  localStorage.setItem("univo_recent_trainers", JSON.stringify(updatedLocal));
  invalidateCache("trainers");

  // 2. Update top-level trainers
  try {
    await setDoc(doc(db, "trainers", trainerId), {
      ...payload,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (e1) {
    console.warn("Error updating top-level trainer:", e1);
  }

  // 3. Update sub-collection
  try {
    await setDoc(doc(db, "gyms", GID, "trainers", trainerId), {
      ...payload,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (e2) {
    console.warn("Error updating gym sub-collection trainer:", e2);
  }

  // 4. If password or email updated, sync users doc
  if (data.email || data.password) {
    try {
      await setDoc(doc(db, "users", trainerId), {
        ...(data.email ? { email: data.email } : {}),
        ...(data.password ? { password: data.password } : {}),
        ...(data.name ? { name: data.name } : {}),
        updatedAt: nowIso
      }, { merge: true });
    } catch (uErr) {}
  }
}

export async function deleteTrainer(gymId, trainerId) {
  const GID = gymId || "univo_main";

  // 1. Remove from local cache immediately
  removeLocalTrainer(trainerId);
  invalidateCache("trainers");

  // 2. Delete from Firestore
  try {
    await deleteDoc(doc(db, "trainers", trainerId));
  } catch (e1) {}
  try {
    await deleteDoc(doc(db, "gyms", GID, "trainers", trainerId));
  } catch (e2) {}
  try {
    await deleteDoc(doc(db, "users", trainerId));
  } catch (e3) {}
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

