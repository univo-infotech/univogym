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
 * @param {string} gymId
 * @returns {Promise<Array>}
 */
export async function getMembers(gymId) {
  try {
    const q = query(
      collection(db, "members"),
      where("gymId", "==", gymId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("getMembers error:", err);
    return [];
  }
}

/**
 * Fetch a single member by ID.
 * @param {string} memberId
 * @returns {Promise<Object|null>}
 */
export async function getMember(memberId) {
  try {
    const snap = await getDoc(doc(db, "members", memberId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    console.error("getMember error:", err);
    return null;
  }
}

/**
 * Generate an invite token for self-registration.
 * Stores a document in `inviteTokens` with a 5-minute TTL.
 * @param {string} gymId
 * @param {Object} opts  { memberName, phone, planId, planName }
 * @returns {Promise<string>} the invite URL
 */
export async function generateInviteToken(gymId, opts = {}) {
  const expiresAt = Timestamp.fromMillis(Date.now() + 5 * 60 * 1000);
  const ref = await addDoc(collection(db, "inviteTokens"), {
    gymId,
    memberName: opts.memberName || "",
    phone: opts.phone || "",
    planId: opts.planId || "",
    planName: opts.planName || "",
    createdAt: serverTimestamp(),
    expiresAt,
    used: false,
  });
  const token = ref.id;
  const url = `${window.location.origin}/#/register/${gymId}/${token}`;
  return url;
}

/**
 * Update a member document.
 * @param {string} memberId
 * @param {Object} data
 */
export async function updateMember(memberId, data) {
  await updateDoc(doc(db, "members", memberId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Validate an invite token. Checks TTL and usage.
 */
export async function validateInviteToken(gymId, token) {
  try {
    const snap = await getDoc(doc(db, "inviteTokens", token));
    if (!snap.exists()) {
      return { valid: false, reason: "Invalid invite link" };
    }
    const data = snap.data();
    if (data.used) {
      return { valid: false, reason: "This invite link has already been used" };
    }
    const now = Date.now();
    const expiresAt = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : data.expiresAt;
    if (expiresAt && now > expiresAt) {
      return { valid: false, reason: "This invite link has expired (5-minute limit)" };
    }
    return { valid: true, data };
  } catch (err) {
    console.error("validateInviteToken error:", err);
    return { valid: false, reason: "Error validating invite link" };
  }
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
    console.error("markTokenUsed error:", err);
  }
}

/**
 * Add a new member to Firestore.
 */
export async function addMember(gymId, memberData) {
  const ref = await addDoc(collection(db, "members"), {
    ...memberData,
    gymId: gymId || "univo_main",
    status: "active",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

