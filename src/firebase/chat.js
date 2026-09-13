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
