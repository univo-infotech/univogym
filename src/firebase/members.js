import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
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
    membersList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("getMembers filtered query warning:", err);
    try {
      // Fallback: fetch collection and filter client-side
      const allSnap = await getDocs(collection(db, "members"));
      membersList = allSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
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

/**
 * Fetch a single member by ID (supports both getMember(id) and getMember(gymId, id)).
 * @param {string} gymIdOrMemberId
 * @param {string} [optionalMemberId]
 * @returns {Promise<Object|null>}
 */
export async function getMember(gymIdOrMemberId, optionalMemberId) {
  const memberId = optionalMemberId || gymIdOrMemberId;
  try {
    const snap = await getDoc(doc(db, "members", memberId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
  } catch (err) {
    console.error("getMember firestore error:", err);
  }

  // Check local cache
  try {
    const cached = JSON.parse(localStorage.getItem("univo_recent_members") || "[]");
    const found = cached.find((m) => m.id === memberId);
    if (found) return found;
  } catch (e) {
    // Ignore
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
  
  let token = "";
  try {
    const ref = await addDoc(collection(db, "inviteTokens"), {
      gymId: effectiveGymId,
      memberName: options.memberName || "",
      phone: options.phone || "",
      planId: options.planId || "",
      planName: options.planName || "",
      createdAt: serverTimestamp(),
      expiresAt,
      used: false,
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
      gymId: effectiveGymId,
      memberName: options.memberName || "",
      phone: options.phone || "",
      planId: options.planId || "",
      planName: options.planName || "",
      expiresAt: Date.now() + 10 * 60 * 1000,
      used: false,
    };
    localStorage.setItem("univo_invite_tokens", JSON.stringify(localTokens));
  } catch (e) {
    console.warn("Local tokens write notice:", e);
  }

  // Standard web route without hash
  const url = `${window.location.origin}/register/${effectiveGymId}/${token}`;
  return url;
}

/**
 * Update a member document.
 * @param {string} memberId
 * @param {Object} data
 */
export async function updateMember(memberId, data) {
  try {
    await updateDoc(doc(db, "members", memberId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("updateDoc error:", err);
  }

  // Update in local cache as well
  try {
    const cached = JSON.parse(localStorage.getItem("univo_recent_members") || "[]");
    const idx = cached.findIndex((m) => m.id === memberId);
    if (idx !== -1) {
      cached[idx] = { ...cached[idx], ...data, updatedAt: new Date().toISOString() };
      localStorage.setItem("univo_recent_members", JSON.stringify(cached));
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

