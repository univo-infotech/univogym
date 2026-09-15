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
  return await addDoc(chatRef, {
    roomId,
    senderId,
    senderName,
    senderRole,
    text: text.trim(),
    type,
    mediaUrl,
    timestamp: serverTimestamp(),
    createdAt: new Date().toISOString()
  });
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

