import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

export function getChatRoomId(trainerId, memberId) {
  const t = String(trainerId || 'trainer').trim();
  const m = String(memberId || 'member').trim();
  return [t, m].sort().join('_');
}

export async function sendChatMessage(gymId, { roomId, senderId, senderName, senderRole, text, type = 'text', mediaUrl = '' }) {
  const GID = gymId || 'univo_main';
  const chatRef = collection(db, 'gyms', GID, 'chatRooms', roomId, 'messages');
  const nowIso = new Date().toISOString();

  const docPromise = addDoc(chatRef, {
    roomId,
    senderId,
    senderName,
    senderRole,
    text: text.trim(),
    type,
    mediaUrl,
    seen: false,
    timestamp: serverTimestamp(),
    createdAt: nowIso
  });

  // Also update room meta for fast unread & list tracking
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const roomDocRef = doc(db, 'gyms', GID, 'chatRooms', roomId);
    setDoc(roomDocRef, {
      roomId,
      lastMessageText: text.trim(),
      lastMessageSenderId: senderId,
      lastMessageSenderRole: senderRole,
      lastMessageCreatedAt: nowIso,
      updatedAt: serverTimestamp(),
      // track unread for the opposite side
      [`unread_${senderRole === 'trainer' ? 'member' : 'trainer'}`]: true
    }, { merge: true }).catch(() => {});
  } catch (e) {}

  return await docPromise;
}

export function subscribeChatMessages(gymId, roomId, callback) {
  const GID = gymId || 'univo_main';
  const chatRef = collection(db, 'gyms', GID, 'chatRooms', roomId, 'messages');
  const q = query(chatRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(msgs);
  }, (err) => {
    console.warn('Chat listener error:', err);
    callback([]);
  });
}

// Mark messages as seen when chat modal is opened by user
export async function markRoomMessagesSeen(gymId, roomId, readerRole) {
  const GID = gymId || 'univo_main';
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const roomDocRef = doc(db, 'gyms', GID, 'chatRooms', roomId);
    await setDoc(roomDocRef, {
      [`unread_${readerRole}`]: false,
      [`lastSeen_${readerRole}`]: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('Error marking messages as seen:', e);
  }
}

// Real-time listener for unread status of a specific room
export function subscribeRoomMeta(gymId, roomId, callback) {
  const GID = gymId || 'univo_main';
  import('firebase/firestore').then(({ doc, onSnapshot: onDocSnapshot }) => {
    const roomDocRef = doc(db, 'gyms', GID, 'chatRooms', roomId);
    return onDocSnapshot(roomDocRef, (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() });
      } else {
        callback(null);
      }
    }, (err) => {
      console.warn('Room meta error:', err);
      callback(null);
    });
  });
}

// ----------------------------------------------------
// CALL SIGNALING & SESSION (VOICE & VIDEO)
// ----------------------------------------------------
export async function startCallSession(gymId, roomId, callData) {
  const GID = gymId || 'univo_main';
  const { doc, setDoc } = await import('firebase/firestore');
  const callDocRef = doc(db, 'gyms', GID, 'chatRooms', roomId, 'callSession', 'active');
  await setDoc(callDocRef, {
    ...callData,
    status: 'ringing', // 'ringing' | 'accepted' | 'ended' | 'rejected'
    createdAt: new Date().toISOString(),
    updatedAt: serverTimestamp()
  });
}

export function subscribeCallSession(gymId, roomId, callback) {
  const GID = gymId || 'univo_main';
  import('firebase/firestore').then(({ doc, onSnapshot: onDocSnapshot }) => {
    const callDocRef = doc(db, 'gyms', GID, 'chatRooms', roomId, 'callSession', 'active');
    return onDocSnapshot(callDocRef, (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() });
      } else {
        callback(null);
      }
    }, (err) => {
      console.warn('Call session error:', err);
      callback(null);
    });
  });
}

export async function updateCallSession(gymId, roomId, updates) {
  const GID = gymId || 'univo_main';
  const { doc, updateDoc } = await import('firebase/firestore');
  const callDocRef = doc(db, 'gyms', GID, 'chatRooms', roomId, 'callSession', 'active');
  await updateDoc(callDocRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

export async function sendCallSignal(gymId, roomId, data) {
  const GID = gymId || 'univo_main';
  const { doc, setDoc } = await import('firebase/firestore');
  const callDocRef = doc(db, 'gyms', GID, 'chatRooms', roomId, 'callSession', 'active');
  await setDoc(callDocRef, data, { merge: true });
}

export async function addIceCandidate(gymId, roomId, target, candidate) {
  const GID = gymId || 'univo_main';
  const { collection, addDoc } = await import('firebase/firestore');
  const candRef = collection(db, 'gyms', GID, 'chatRooms', roomId, 'callSession', 'active', target);
  await addDoc(candRef, candidate.toJSON ? candidate.toJSON() : candidate);
}

export function subscribeIceCandidates(gymId, roomId, target, callback) {
  const GID = gymId || 'univo_main';
  import('firebase/firestore').then(({ collection, onSnapshot: onCollSnapshot }) => {
    const candRef = collection(db, 'gyms', GID, 'chatRooms', roomId, 'callSession', 'active', target);
    return onCollSnapshot(candRef, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          callback(change.doc.data());
        }
      });
    });
  });
}

export async function endCallSession(gymId, roomId) {
  const GID = gymId || 'univo_main';
  const { doc, deleteDoc } = await import('firebase/firestore');
  const callDocRef = doc(db, 'gyms', GID, 'chatRooms', roomId, 'callSession', 'active');
  try {
    await deleteDoc(callDocRef);
  } catch (e) {
    console.warn('Delete call session err:', e);
  }
}
