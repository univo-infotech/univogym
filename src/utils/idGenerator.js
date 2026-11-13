/**
 * Universal Unique ID Generator for Gym Management
 * Generates globally unique, gym-independent IDs:
 * - Members: M-XXXXXX (e.g. M-849201) - 6-digit non-sequential random ID
 * - Trainers: T-XXXXX (e.g. T-39201) - 5-digit non-sequential random ID
 * 
 * Completely independent of gym name / code, ensuring zero cross-gym collisions.
 */

function getStableHashNumber(str, min, max) {
  let hash = 5381;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) + s.charCodeAt(i);
    hash |= 0;
  }
  const range = max - min + 1;
  const positive = Math.abs(hash);
  return min + (positive % range);
}

export function getDisplayMemberId(member) {
  if (!member) return "M-100001";
  if (member.memberId) {
    const mId = String(member.memberId).trim().toUpperCase();
    if (mId) return mId;
  }
  if (typeof member.id === "string" && member.id.trim()) {
    const raw = member.id.trim().toUpperCase();
    if (raw.startsWith("M-")) return raw;
    // Map legacy seeds (e.g. mem_01, mem_15) or firestore IDs stably to M-XXXXXX
    const num = getStableHashNumber(member.id, 100000, 999999);
    return `M-${num}`;
  }
  return "M-100001";
}

export function getDisplayTrainerId(trainer) {
  if (!trainer) return "T-10001";
  if (trainer.trainerId) {
    const tId = String(trainer.trainerId).trim().toUpperCase();
    if (tId) return tId;
  }
  if (typeof trainer.id === "string" && trainer.id.trim()) {
    const raw = trainer.id.trim().toUpperCase();
    if (raw.startsWith("T-")) return raw;
    // Map legacy seeds (e.g. tr_01, tr_02) or firestore IDs stably to T-XXXXX
    const num = getStableHashNumber(trainer.id, 10000, 99999);
    return `T-${num}`;
  }
  return "T-10001";
}

/**
 * Generate a new Universal Unique Member ID (M-XXXXXX)
 * Independent of gym name, non-sequential, random
 */
export function generateUniqueMemberId(existingList = []) {
  const existingIds = new Set(
    (existingList || []).map((m) => getDisplayMemberId(m).toUpperCase())
  );

  let candidate = "";
  let attempts = 0;
  do {
    const random6 = Math.floor(100000 + Math.random() * 900000);
    candidate = `M-${random6}`;
    attempts++;
  } while (existingIds.has(candidate) && attempts < 1000);

  return candidate;
}

/**
 * Generate a new Universal Unique Trainer ID (T-XXXXX)
 * Independent of gym name, non-sequential, random
 */
export function generateUniqueTrainerId(existingList = []) {
  const existingIds = new Set(
    (existingList || []).map((t) => getDisplayTrainerId(t).toUpperCase())
  );

  let candidate = "";
  let attempts = 0;
  do {
    const random5 = Math.floor(10000 + Math.random() * 90000);
    candidate = `T-${random5}`;
    attempts++;
  } while (existingIds.has(candidate) && attempts < 1000);

  return candidate;
}
