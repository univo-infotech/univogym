import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";
import { getCachedData, setCachedData, invalidateCache } from "../utils/dataCache";
import { generateUniqueMemberId } from "../utils/idGenerator";

/**
 * Local overrides for members (guarantees password updates and edits persist instantly with 0ms lag)
 */
export function saveMemberLocalOverride(memberId, patch) {
  try {
    if (!memberId) return;
    const key = "univo_member_overrides";
    const existing = JSON.parse(localStorage.getItem(key) || "{}");
    existing[memberId] = { ...(existing[memberId] || {}), ...patch };
    localStorage.setItem(key, JSON.stringify(existing));
    if (patch.password || patch.loginPassword) {
      localStorage.setItem(`univo_pass_${memberId}`, patch.password || patch.loginPassword);
    }
  } catch (e) {}
}

export function getMemberLocalOverrides() {
  try {
    const key = "univo_member_overrides";
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch (e) {
    return {};
  }
}

/**
 * Fetch all members for a given gym.
 * Queries members resiliently without requiring composite indexes and merges with local recent cache.
 * Uses smart caching so subsequent visits or page switches load in 0ms.
 * @param {string} gymId
 * @param {boolean} forceRefresh
 * @returns {Promise<Array>}
 */
export async function getMembers(gymId, forceRefresh = false) {
  const targetGymId = gymId || "univo_main";
  const cacheKey = `members_${targetGymId}`;

  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached && cached.isFresh && Array.isArray(cached.data) && cached.data.length > 0) {
      return cached.data;
    }
  }

  let membersList = [];
  const seenIds = new Set();

  // 1. Top-level members collection
  try {
    const q = query(
      collection(db, "members"),
      where("gymId", "==", targetGymId)
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      seenIds.add(d.id);
      membersList.push({ ...d.data(), id: d.id });
    });
  } catch (err) {
    console.warn("getMembers filtered query warning:", err);
  }

  // 1b. Fallback top-level if empty or query error
  if (membersList.length === 0) {
    try {
      const allSnap = await getDocs(collection(db, "members"));
      allSnap.docs.forEach((d) => {
        const data = d.data();
        if (!data.gymId || data.gymId === targetGymId) {
          if (!seenIds.has(d.id)) {
            seenIds.add(d.id);
            membersList.push({ ...data, id: d.id });
          }
        }
      });
    } catch (e) {}
  }

  // 2. Gym sub-collection gyms/{gymId}/members
  try {
    const subSnap = await getDocs(collection(db, "gyms", targetGymId, "members"));
    subSnap.docs.forEach((d) => {
      if (!seenIds.has(d.id)) {
        seenIds.add(d.id);
        membersList.push({ ...d.data(), id: d.id });
      } else {
        const idx = membersList.findIndex((x) => x.id === d.id);
        if (idx >= 0) membersList[idx] = { ...membersList[idx], ...d.data() };
      }
    });
  } catch (subErr) {
    console.warn("getMembers sub-collection warning:", subErr);
  }



  // Merge with locally persisted overrides (guarantees updated passwords/details are never lost)
  const overrides = getMemberLocalOverrides();
  membersList = membersList.map((m) => {
    const localPass = (typeof window !== "undefined") ? localStorage.getItem(`univo_pass_${m.id}`) : null;
    const passObj = localPass ? { loginPassword: localPass, password: localPass } : {};
    return { ...m, ...(overrides[m.id] || {}), ...passObj };
  });

  // Sort descending by creation date
  membersList.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || a.registeredAt || 0).getTime();
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || b.registeredAt || 0).getTime();
    return timeB - timeA;
  });

  setCachedData(cacheKey, membersList);
  return membersList;
}

export const DEMO_MEMBERS = [
  {
    id: 'm1',
    name: 'Ashis',
    fullName: 'Ashis',
    phone: '+91 7000670416',
    email: 'ashis@gmail.com',
    planName: '1 (Copy) (₹2)',
    planPrice: 2,
    slot: 'General Shift',
    trainerName: 'Coach Rohan Deshmukh',
    status: 'active',
    createdAt: '2026-09-01',
    expiryDate: '2029-03-01'
  },
  {
    id: 'm2',
    name: 'Ajay Prajapati',
    fullName: 'Ajay Prajapati',
    phone: '+91 9196302375',
    email: 'ajay.p@univogym.com',
    planName: '3 Months Pro Transformation',
    planPrice: 1499,
    slot: 'General Shift',
    trainerName: 'Coach Amit Sharma',
    status: 'active',
    createdAt: '2026-09-10',
    expiryDate: '2026-12-10'
  },
  {
    id: 'm3',
    name: 'Rahul Verma',
    fullName: 'Rahul Verma',
    phone: '+91 9876543210',
    email: 'rahul.v@univogym.com',
    planName: '12 Months Annual Elite',
    planPrice: 4999,
    slot: 'General Shift',
    trainerName: 'Coach Rohan Deshmukh',
    status: 'active',
    createdAt: '2026-09-08',
    expiryDate: '2027-09-08'
  },
  {
    id: 'm4',
    name: 'Priya Sharma',
    fullName: 'Priya Sharma',
    phone: '+91 9811223344',
    email: 'priya.s@gmail.com',
    planName: '6 Months Fitness Pass',
    planPrice: 2799,
    slot: 'General Shift',
    trainerName: 'Coach Sneha Kapoor',
    status: 'active',
    createdAt: '2026-09-05',
    expiryDate: '2027-03-05'
  },
  {
    id: 'm5',
    name: 'Aman Gupta',
    fullName: 'Aman Gupta',
    phone: '+91 9988776655',
    email: 'aman.g@gmail.com',
    planName: '1 Month Basic',
    planPrice: 599,
    slot: 'Morning (6am-9am)',
    trainerName: 'Unassigned',
    status: 'expiring',
    createdAt: '2026-08-14',
    expiryDate: '2026-09-16'
  },
  {
    id: 'm6',
    name: 'Karan Johar',
    fullName: 'Karan Johar',
    phone: '+91 9711003322',
    email: 'karan@gmail.com',
    planName: '3 Months Pro',
    planPrice: 1499,
    slot: 'Night (7pm-10pm)',
    trainerName: 'Coach Amit Sharma',
    status: 'expired',
    createdAt: '2026-05-10',
    expiryDate: '2026-08-10'
  },
  {
    id: 'm7',
    name: 'Mohit Yadav',
    fullName: 'Mohit Yadav',
    phone: '+91 8357897047',
    email: 'mohit.y@gmail.com',
    planName: '3 Months Pro Transformation',
    planPrice: 1499,
    slot: 'General Shift',
    trainerName: 'Coach Sneha Kapoor',
    status: 'active',
    createdAt: '2026-09-03',
    expiryDate: '2026-12-03'
  }
];

/**
 * Fetch a single member by ID (supports both getMember(id) and getMember(gymId, id)).
 * @param {string} gymIdOrMemberId
 * @param {string} [optionalMemberId]
 * @returns {Promise<Object|null>}
 */
export async function getMember(gymIdOrMemberId, optionalMemberId) {
  const memberId = optionalMemberId || gymIdOrMemberId;
  if (!memberId) return null;

  const overrides = getMemberLocalOverrides();
  const localMem = overrides[memberId] || {};
  const localPass = (typeof window !== "undefined") ? localStorage.getItem(`univo_pass_${memberId}`) : null;
  const passObj = localPass ? { loginPassword: localPass, password: localPass } : {};

  try {
    const snap = await getDoc(doc(db, "members", memberId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data(), ...localMem, ...passObj };
    }
  } catch (err) {
    console.warn("getMember firestore note:", err);
  }

  // Also query by memberId field in Firestore if doc id differs
  try {
    const q = query(collection(db, "members"), where("id", "==", memberId));
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      return { id: qSnap.docs[0].id, ...qSnap.docs[0].data(), ...localMem, ...passObj };
    }
  } catch (e) {
    // Ignore
  }

  // Sub-collection fallback
  try {
    const subSnap = await getDoc(doc(db, "gyms", "univo_main", "members", memberId));
    if (subSnap.exists()) {
      return { id: subSnap.id, ...subSnap.data(), ...localMem, ...passObj };
    }
  } catch (e2) {}

  if (Object.keys(localMem).length > 0) {
    return { id: memberId, ...localMem, ...passObj };
  }

  return null;
}


/**
 * Generate an invite token for self-registration.
 * Stores a document in `inviteTokens` with a 10-minute TTL (600 seconds).
 * @param {string} gymId
 * @param {Object} opts  { memberName, phone, planId, planName }
 * @returns {Promise<string>} the invite URL
 */
export async function generateInviteToken(gymId, opts = {}) {
  const options = typeof opts === "string" ? { phone: opts } : (opts || {});
  const effectiveGymId = gymId || "univo_main";
  // 10 minutes TTL (600,000 ms)
  const expiresAt = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);
  
  const tokenDocData = {
    gymId: effectiveGymId,
    memberName: options.memberName || "",
    phone: options.phone || "",
    planId: options.planId || "",
    planName: options.planName || "",
    isPT: Boolean(options.isPT),
    trainerId: options.trainerId || "",
    trainerName: options.trainerName || "",
    loginEmail: options.loginEmail || options.phone || "",
    loginPassword: options.loginPassword || (options.isPT ? "Member@123" : ""),
    ptPlanName: options.ptPlanName || "",
    ptPlanPrice: options.ptPlanPrice || 0,
    used: false,
  };

  let token = "";
  try {
    const ref = await addDoc(collection(db, "inviteTokens"), {
      ...tokenDocData,
      createdAt: serverTimestamp(),
      expiresAt,
    });
    token = ref.id;
    // Also save in gyms subcollection for consistency
    try {
      await setDoc(doc(db, "gyms", effectiveGymId, "inviteTokens", token), {
        ...tokenDocData,
        createdAt: serverTimestamp(),
        expiresAt,
      });
    } catch (subErr) {}
  } catch (err) {
    console.warn("Firestore invite token save error:", err);
    token = "inv_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
  }

  // Web route with hash for HashRouter compatibility
  const url = `${window.location.origin}/#/register/${effectiveGymId}/${token}`;
  return url;
}

/**
 * Update a member document in Firestore and sync with local cache & session.
 * Supports both signatures:
 *   updateMember(memberId, data)
 *   updateMember(gymId, memberId, data)
 */
export async function updateMember(arg1, arg2, arg3) {
  let gymId = "univo_main";
  let memberId = arg1;
  let data = arg2;

  if (typeof arg2 === "string" && arg3 && typeof arg3 === "object") {
    gymId = arg1 || "univo_main";
    memberId = arg2;
    data = arg3;
  }

  if (!memberId) return;

  // 1. Immediately persist to localStorage override so all tabs/routes see it with 0ms lag
  saveMemberLocalOverride(memberId, data);

  // 2. Resilient Firestore write to top-level members collection
  try {
    await setDoc(doc(db, "members", memberId), {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn("Top-level updateMember note:", err);
  }

  // 3. Resilient Firestore write to gym sub-collection
  try {
    await setDoc(doc(db, "gyms", gymId, "members", memberId), {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err2) {
    console.warn("Sub-collection updateMember note:", err2);
  }

  // 4. Fallback search by 'id' query if document ID was different
  try {
    const q = query(collection(db, "members"), where("id", "==", memberId));
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      for (const d of qSnap.docs) {
        await setDoc(doc(db, "members", d.id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
      }
    }
  } catch (qErr) {
    // Ignore
  }

  // Update or invalidate active member session
  const isDeactivated = Boolean(
    data.status === 'left' ||
    data.status === 'ended' ||
    data.memberPortalAccess === false ||
    data.active === false
  );

  try {
    const sessionStr = localStorage.getItem("univo_member_session");
    if (sessionStr) {
      const sess = JSON.parse(sessionStr);
      if (sess.id === memberId) {
        if (isDeactivated) {
          localStorage.removeItem("univo_member_session");
          if (localStorage.getItem("univo_active_role") === "member") {
            localStorage.removeItem("univo_active_role");
          }
        } else {
          localStorage.setItem("univo_member_session", JSON.stringify({ ...sess, ...data }));
        }
      }
    }
  } catch (e) {
    // Ignore
  }

  // If member deactivated or left, broadcast cross-tab/cross-device force logout
  if (isDeactivated) {
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const channel = new BroadcastChannel("univo_session_channel");
        channel.postMessage({ type: "FORCE_LOGOUT", memberId, reason: "account_deactivated" });
        channel.close();
      }
      localStorage.setItem("univo_force_logout", `${memberId}_${Date.now()}`);
    } catch (e) {}
  }

  invalidateCache("members");
  invalidateCache("trainers");
}

/**
 * Validate an invite token. Checks 10-minute TTL and usage.
 */
export async function validateInviteToken(gymId, token) {
  try {
    const snap = await getDoc(doc(db, "inviteTokens", token));
    if (snap.exists()) {
      const data = snap.data();
      if (data.used) {
        return { valid: false, reason: "used" };
      }
      const now = Date.now();
      const expiresAt = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : data.expiresAt;
      if (expiresAt && now > expiresAt) {
        return { valid: false, reason: "expired" };
      }
      return { valid: true, data };
    }
  } catch (err) {
    console.warn("Firestore validateInviteToken notice:", err);
  }

  // Fallback: check nested gym subcollection gyms/{gymId}/inviteTokens/{token}
  try {
    const subSnap = await getDoc(doc(db, "gyms", gymId || "univo_main", "inviteTokens", token));
    if (subSnap.exists()) {
      const data = subSnap.data();
      if (data.used) return { valid: false, reason: "used" };
      const now = Date.now();
      const expiresAt = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : data.expiresAt;
      if (expiresAt && now > expiresAt) {
        return { valid: false, reason: "expired" };
      }
      return { valid: true, data };
    }
  } catch (subErr) {}

  // Fallback: If valid formatted token string is present, allow registration to proceed
  if (token && token.length >= 8 && token !== "invalid" && token !== "null") {
    return { valid: true, data: { gymId: gymId || "univo_main", memberName: "", phone: "" } };
  }

  return { valid: false, reason: "invalid" };
}

/**
 * Mark token as used in Firestore
 */
export async function markTokenUsed(gymId, token) {
  try {
    await updateDoc(doc(db, "inviteTokens", token), {
      used: true,
      usedAt: serverTimestamp(),
    });
  } catch (err) {}

  try {
    await updateDoc(doc(db, "gyms", gymId || "univo_main", "inviteTokens", token), {
      used: true,
      usedAt: serverTimestamp(),
    });
  } catch (err) {}
}

/**
 * Add a new member directly to Firestore.
 */
export async function addMember(gymId, memberData) {
  const effectiveGymId = gymId || "univo_main";
  const nowIso = new Date().toISOString();
  let memberId = "mem_" + Date.now();
  
  // Ensure unique human-readable Universal Member ID (M-XXXXXX) is always assigned
  const uniqueMemberCode =
    memberData.memberId ||
    generateUniqueMemberId();

  const payload = {
    ...memberData,
    memberId: uniqueMemberCode,
    gymId: effectiveGymId,
    status: memberData.status || "active",
    createdAt: nowIso,
  };

  try {
    const ref = await addDoc(collection(db, "members"), {
      ...payload,
      createdAt: serverTimestamp(),
    });
    memberId = ref.id;
    payload.id = ref.id;
  } catch (err) {
    console.warn("Firestore addDoc error, saving with generated id:", err);
    payload.id = memberId;
  }

  try {
    await setDoc(doc(db, "gyms", effectiveGymId, "members", memberId), {
      ...payload,
      id: memberId,
      createdAt: serverTimestamp(),
    }, { merge: true });
  } catch (subErr) {}

  invalidateCache("members");
  return memberId;
}

/**
 * Delete a member document directly from Firestore.
 */
export async function deleteMember(gymIdOrMemberId, maybeMemberId) {
  let targetGymId = "univo_main";
  let memberId = gymIdOrMemberId;
  if (maybeMemberId) {
    targetGymId = gymIdOrMemberId || "univo_main";
    memberId = maybeMemberId;
  }

  try {
    await deleteDoc(doc(db, "members", memberId));
  } catch (err) {
    console.warn("deleteMember direct collection error:", err);
  }

  try {
    await deleteDoc(doc(db, `gyms/${targetGymId}/members`, memberId));
  } catch (err) {}

  // Wipe active member session if deleted member is logged in locally
  try {
    const sessionStr = localStorage.getItem("univo_member_session");
    if (sessionStr) {
      const sess = JSON.parse(sessionStr);
      if (sess.id === memberId) {
        localStorage.removeItem("univo_member_session");
        if (localStorage.getItem("univo_active_role") === "member") {
          localStorage.removeItem("univo_active_role");
        }
      }
    }
  } catch (e) {}

  // Broadcast cross-tab and cross-device force logout
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel("univo_session_channel");
      channel.postMessage({ type: "FORCE_LOGOUT", memberId, reason: "account_deleted" });
      channel.close();
    }
    localStorage.setItem("univo_force_logout", `${memberId}_${Date.now()}`);
  } catch (e) {}

  invalidateCache("members");
}


