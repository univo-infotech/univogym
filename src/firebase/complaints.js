import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

/**
 * Submit a new trainer complaint by a member
 */
export async function submitComplaint(gymId, complaintData) {
  const GID = gymId || "univo_main";
  const now = new Date().toISOString();
  
  const payload = {
    ...complaintData,
    gymId: GID,
    status: "pending", // 'pending' | 'in_progress' | 'resolved' | 'dismissed'
    createdAt: now,
    replies: [],
  };

  let createdId = "comp_" + Date.now();

  try {
    const ref1 = await addDoc(collection(db, "complaints"), {
      ...payload,
      timestamp: serverTimestamp(),
    });
    createdId = ref1.id;
    payload.id = ref1.id;
  } catch (e) {
    try {
      const ref2 = await addDoc(collection(db, "gyms", GID, "complaints"), {
        ...payload,
        timestamp: serverTimestamp(),
      });
      createdId = ref2.id;
      payload.id = ref2.id;
    } catch (e2) {
      payload.id = createdId;
    }
  }

  // Also save to nested gyms/{gymId}/complaints for consistency
  try {
    if (createdId && !createdId.startsWith("comp_")) {
      await addDoc(collection(db, "gyms", GID, "complaints"), {
        ...payload,
        id: createdId,
        timestamp: serverTimestamp(),
      });
    }
  } catch (e3) {}

  return createdId;
}

/**
 * Get all complaints for the gym (Owner view)
 */
export async function getGymComplaints(gymId) {
  const GID = gymId || "univo_main";
  let list = [];
  const seenIds = new Set();

  try {
    const q1 = query(collection(db, "complaints"), where("gymId", "==", GID));
    const snap1 = await getDocs(q1);
    snap1.docs.forEach((d) => {
      seenIds.add(d.id);
      list.push({ id: d.id, ...d.data() });
    });
  } catch (e) {
    try {
      const snapAll = await getDocs(collection(db, "complaints"));
      snapAll.docs.forEach((d) => {
        const data = d.data();
        if (!data.gymId || data.gymId === GID) {
          seenIds.add(d.id);
          list.push({ id: d.id, ...data });
        }
      });
    } catch (e2) {}
  }

  // Also check gyms/{gymId}/complaints
  try {
    const snapNested = await getDocs(collection(db, "gyms", GID, "complaints"));
    snapNested.docs.forEach((d) => {
      if (!seenIds.has(d.id)) {
        seenIds.add(d.id);
        list.push({ id: d.id, ...d.data() });
      }
    });
  } catch (e3) {}

  // Sort descending by date
  list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return list;
}

/**
 * Get complaints filed by a specific member
 */
export async function getMemberComplaints(gymId, memberId) {
  const all = await getGymComplaints(gymId);
  return all.filter((c) => c.memberId === memberId || (c.memberPhone && c.memberPhone === memberId));
}

/**
 * Owner replies to a complaint and optionally updates status
 */
export async function replyToComplaint(gymId, complaintId, replyText, newStatus = "resolved", repliedBy = "Gym Owner") {
  const GID = gymId || "univo_main";
  const newReply = {
    id: Date.now().toString(),
    text: replyText,
    repliedBy,
    repliedAt: new Date().toISOString(),
  };

  const updateData = {
    status: newStatus,
    updatedAt: serverTimestamp(),
  };

  try {
    const allComplaints = await getGymComplaints(GID);
    const target = allComplaints.find((c) => c.id === complaintId);
    const existingReplies = Array.isArray(target?.replies) ? target.replies : [];
    const updatedReplies = [...existingReplies, newReply];

    try {
      await updateDoc(doc(db, "complaints", complaintId), {
        ...updateData,
        replies: updatedReplies,
        lastReply: newReply,
      });
    } catch (e1) {}

    try {
      await updateDoc(doc(db, "gyms", GID, "complaints", complaintId), {
        ...updateData,
        replies: updatedReplies,
        lastReply: newReply,
      });
    } catch (e2) {}
  } catch (err) {
    console.error("Error replying to complaint:", err);
  }
}
