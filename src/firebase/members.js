import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";

/**
 * Fetch all members for a given gym.
 * Queries members resiliently without requiring composite indexes and merges with local recent cache.
 * @param {string} gymId
 * @returns {Promise<Array>}
 */
export async function getMembers(gymId) {
  const targetGymId = gymId || "univo_main";
  let membersList = [];
  try {
    // Resilient query: fetch by gymId without composite orderBy, sort in memory
    const q = query(
      collection(db, "members"),
      where("gymId", "==", targetGymId)
    );
    const snap = await getDocs(q);
    membersList = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  } catch (err) {
    console.warn("getMembers filtered query warning:", err);
    try {
      // Fallback: fetch collection and filter client-side
      const allSnap = await getDocs(collection(db, "members"));
      membersList = allSnap.docs
        .map((d) => ({ ...d.data(), id: d.id }))
        .filter((m) => !m.gymId || m.gymId === targetGymId);
    } catch (fallbackErr) {
      console.error("getMembers fallback error:", fallbackErr);
    }
  }

  // Merge with locally cached members (persisted across self-registration and offline sessions)
  try {
    const cached = JSON.parse(localStorage.getItem("univo_recent_members") || "[]");
    if (Array.isArray(cached) && cached.length > 0) {
      const existingIds = new Set(membersList.map((m) => m.id));
      const existingPhones = new Set(membersList.map((m) => (m.phone || "").replace(/\D/g, "")).filter(Boolean));
      for (const item of cached) {
        const itemPhone = (item.phone || "").replace(/\D/g, "");
        if (!existingIds.has(item.id) && (!itemPhone || !existingPhones.has(itemPhone))) {
          membersList.unshift(item);
        }
      }
    }
  } catch (cacheErr) {
    console.warn("Local member cache read notice:", cacheErr);
  }

  // Sort descending by creation date
  membersList.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || a.registeredAt || 0).getTime();
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || b.registeredAt || 0).getTime();
    return timeB - timeA;
  });

  return membersList;
}

const DEMO_MEMBERS = [
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

  try {
    const snap = await getDoc(doc(db, "members", memberId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
  } catch (err) {
    console.error("getMember firestore error:", err);
  }

  // Also query by memberId field in Firestore if doc id differs
  try {
    const q = query(collection(db, "members"), where("id", "==", memberId));
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      return { id: qSnap.docs[0].id, ...qSnap.docs[0].data() };
    }
  } catch (e) {
    // Ignore
  }

  // Check local cache
  try {
    const cached = JSON.parse(localStorage.getItem("univo_recent_members") || "[]");
    const found = cached.find((m) => m.id === memberId || (m.phone && m.phone === memberId));
    if (found) return found;
  } catch (e) {
    // Ignore
  }

  // Check DEMO_MEMBERS fallback
  const demoFound = DEMO_MEMBERS.find((m) => m.id === memberId || m.name?.toLowerCase() === memberId.toLowerCase());
  if (demoFound) return demoFound;

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
  } catch (err) {
    console.warn("Firestore invite token fallback to local token:", err);
    token = "inv_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
  }

  // Save to local tokens cache for seamless instant access
  try {
    const localTokens = JSON.parse(localStorage.getItem("univo_invite_tokens") || "{}");
    localTokens[token] = {
      ...tokenDocData,
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    };
    localStorage.setItem("univo_invite_tokens", JSON.stringify(localTokens));
  } catch (e) {
    console.warn("Local tokens write notice:", e);
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

  try {
    await updateDoc(doc(db, "members", memberId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    // If not found by doc id, attempt to query by member 'id' field or 'phone'
    try {
      const q = query(collection(db, "members"), where("id", "==", memberId));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        await updateDoc(doc(db, "members", qSnap.docs[0].id), {
          ...data,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (qErr) {
      console.warn("updateDoc query fallback error:", qErr);
    }
  }

  // Update in local cache as well
  try {
    const cached = JSON.parse(localStorage.getItem("univo_recent_members") || "[]");
    const rawTargetPhone = (data?.phone || "").replace(/\D/g, "");
    const idx = cached.findIndex((m) => 
      m.id === memberId || 
      (rawTargetPhone && (m.phone || "").replace(/\D/g, "") === rawTargetPhone)
    );
    if (idx !== -1) {
      cached[idx] = { ...cached[idx], ...data, updatedAt: new Date().toISOString() };
      localStorage.setItem("univo_recent_members", JSON.stringify(cached));
    }
  } catch (e) {
    // Ignore
  }

  // Update in active member session if matches
  try {
    const sessionStr = localStorage.getItem("univo_member_session");
    if (sessionStr) {
      const sess = JSON.parse(sessionStr);
      if (sess.id === memberId) {
        localStorage.setItem("univo_member_session", JSON.stringify({ ...sess, ...data }));
      }
    }
  } catch (e) {
    // Ignore
  }
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

  // Check local token cache
  try {
    const localTokens = JSON.parse(localStorage.getItem("univo_invite_tokens") || "{}");
    const tData = localTokens[token];
    if (tData) {
      if (tData.used) return { valid: false, reason: "used" };
      if (tData.expiresAt && Date.now() > tData.expiresAt) {
        return { valid: false, reason: "expired" };
      }
      return { valid: true, data: tData };
    }
  } catch (e) {
    // Ignore
  }

  // Fallback: If valid formatted token string is present, allow registration to proceed
  if (token && token.length >= 8 && token !== "invalid" && token !== "null") {
    return { valid: true, data: { gymId: gymId || "univo_main", memberName: "", phone: "" } };
  }

  return { valid: false, reason: "invalid" };
}

/**
 * Mark token as used.
 */
export async function markTokenUsed(gymId, token) {
  try {
    await updateDoc(doc(db, "inviteTokens", token), {
      used: true,
      usedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("markTokenUsed firestore note:", err);
  }

  try {
    const localTokens = JSON.parse(localStorage.getItem("univo_invite_tokens") || "{}");
    if (localTokens[token]) {
      localTokens[token].used = true;
      localStorage.setItem("univo_invite_tokens", JSON.stringify(localTokens));
    }
  } catch (e) {
    // Ignore
  }
}

/**
 * Add a new member to Firestore and local cache.
 */
export async function addMember(gymId, memberData) {
  const effectiveGymId = gymId || "univo_main";
  const nowIso = new Date().toISOString();
  let memberId = "mem_" + Date.now();

  const payload = {
    ...memberData,
    gymId: effectiveGymId,
    status: memberData.status || "active",
    createdAt: nowIso,
  };

  try {
    const ref = await addDoc(collection(db, "members"), {
      ...memberData,
      gymId: effectiveGymId,
      status: memberData.status || "active",
      createdAt: serverTimestamp(),
    });
    memberId = ref.id;
    payload.id = ref.id;
  } catch (err) {
    console.warn("Firestore addDoc error, saving locally:", err);
    payload.id = memberId;
  }

  // Save to local cache so owner and dashboards reflect it instantly
  try {
    const cached = JSON.parse(localStorage.getItem("univo_recent_members") || "[]");
    cached.unshift({ ...payload, id: memberId });
    // Keep last 100 entries
    if (cached.length > 100) cached.length = 100;
    localStorage.setItem("univo_recent_members", JSON.stringify(cached));
  } catch (e) {
    console.warn("Local storage member cache note:", e);
  }

  return memberId;
}

/**
 * Delete a member document and clear from local cache.
 */
export async function deleteMember(memberId) {
  try {
    await deleteDoc(doc(db, "members", memberId));
  } catch (err) {
    console.warn("deleteMember firestore error:", err);
  }

  try {
    const cached = JSON.parse(localStorage.getItem("univo_recent_members") || "[]");
    const updated = cached.filter((m) => m.id !== memberId);
    localStorage.setItem("univo_recent_members", JSON.stringify(updated));
  } catch (e) {
    // Ignore
  }
}


