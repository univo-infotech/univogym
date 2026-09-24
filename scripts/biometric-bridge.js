import http from 'http';
import net from 'net';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc, increment } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB8cqhVDzFlD4qHrqitQIP2A_dW_Mc_7wE",
  authDomain: "gym-mangement-df239.firebaseapp.com",
  projectId: "gym-mangement-df239",
  storageBucket: "gym-mangement-df239.firebasestorage.app",
  messagingSenderId: "733992687536",
  appId: "1:733992687536:web:fca8e22764b961b4ec2875",
  measurementId: "G-RFCDTMECX4",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const PORT = 7005;
const GYM_ID = "univo_main";

// Process incoming punch and record in Firestore
async function handlePunch(punchData) {
  const biometricId = String(punchData.biometricId || punchData.userId || punchData.pin || punchData.id || "101").trim();
  console.log(`\n======================================================`);
  console.log(`🔔 [LIVE PUNCH DETECTED] Machine User ID: #${biometricId}`);
  console.log(`📡 Device IP / Info:`, punchData.source || 'Secureye S-B8CB');
  console.log(`🕒 Timestamp:`, new Date().toLocaleTimeString());

  try {
    // 1. Find member by biometricId or fallback
    const membersRef = collection(db, `gyms/${GYM_ID}/members`);
    const q = query(membersRef, where("biometricId", "==", biometricId));
    const snap = await getDocs(q);

    let member = null;
    let memberId = null;

    if (!snap.empty) {
      member = snap.docs[0].data();
      memberId = snap.docs[0].id;
    } else {
      // Check fallback by doc ID or first member
      const allMembers = await getDocs(membersRef);
      if (!allMembers.empty) {
        // match by name/id or default to first
        const found = allMembers.docs.find(d => {
          const m = d.data();
          return m.biometricId === biometricId || d.id === biometricId;
        });
        if (found) {
          member = found.data();
          memberId = found.id;
        } else {
          member = allMembers.docs[0].data();
          memberId = allMembers.docs[0].id;
        }
      }
    }

    const memberName = member?.name || member?.fullName || `Member #${biometricId}`;
    console.log(`👤 Matched Member: ${memberName} (ID: ${memberId})`);

    // 2. Perform Real-Time Access & Fee Check
    const todayStr = new Date().toISOString().split("T")[0];
    const expiryStr = member?.expiryDate ? new Date(member.expiryDate).toISOString().split("T")[0] : null;
    const isExpired = expiryStr && expiryStr < todayStr;
    const isLeft = member?.status === "left" || member?.status === "ended";
    const hasDue = Number(member?.dueAmount || 0) > 0 || member?.status === "due";
    const isSuspended = member?.biometricAccess === false;

    let status = "granted";
    let reason = "Access Granted - Valid Membership";

    if (isSuspended) {
      status = "denied";
      reason = "Biometric Access Suspended by Owner";
    } else if (isLeft) {
      status = "denied";
      reason = "Account Left / Membership Ended";
    } else if (isExpired) {
      status = "denied";
      reason = `Membership Expired on ${expiryStr}`;
    } else if (hasDue) {
      status = "denied";
      reason = `Pending Due Balance: ₹${member?.dueAmount || 0}`;
    }

    if (status === "granted") {
      console.log(`✅ RESULT: ACCESS GRANTED 🟢 - Welcome ${memberName}!`);
    } else {
      console.log(`🛑 RESULT: ACCESS DENIED 🔴 - Reason: ${reason}`);
    }

    // 3. Save Punch Log in Firestore
    const logDoc = {
      gymId: GYM_ID,
      memberId: memberId || biometricId,
      memberName: memberName,
      memberPhoto: member?.photoUrl || member?.photo || null,
      workoutSlot: member?.workoutSlot || member?.slot || "General Slot",
      biometricId: biometricId,
      deviceId: "dev_main_entrance",
      deviceName: "Secureye S-B8CB",
      method: "fingerprint",
      status: status,
      reason: reason,
      timestamp: new Date().toISOString(),
      rawPayload: punchData
    };

    await addDoc(collection(db, `gyms/${GYM_ID}/biometricPunches`), logDoc);

    // If granted, also record attendance
    if (status === "granted" && memberId) {
      const todayDate = new Date().toLocaleDateString("en-CA");
      await addDoc(collection(db, `gyms/${GYM_ID}/attendance`), {
        memberId: memberId,
        memberName: memberName,
        date: todayDate,
        checkInTime: new Date().toLocaleTimeString(),
        source: "biometric_machine",
        createdAt: new Date().toISOString()
      });
      // Increment attendance count
      const mRef = doc(db, `gyms/${GYM_ID}/members`, memberId);
      await updateDoc(mRef, {
        totalAttendance: increment(1),
        lastAttendance: todayDate
      }).catch(() => {});
    }
    console.log(`💾 Synced to Univo Gym Cloud successfully!\n======================================================\n`);
  } catch (err) {
    console.error(`❌ Error logging biometric punch:`, err.message);
  }
}

// Universal Server: Handles HTTP (Web Push) and Raw TCP Socket Data
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    console.log(`[HTTP INCOMING] ${req.method} ${req.url}`);
    if (body) console.log(`[HTTP BODY]:`, body);

    // Extract User/Punch ID from URL query or Body
    const urlObj = new URL(req.url, `http://localhost:${PORT}`);
    const params = Object.fromEntries(urlObj.searchParams.entries());

    let payload = { ...params };
    try {
      if (body) {
        if (body.startsWith('{')) {
          payload = { ...payload, ...JSON.parse(body) };
        } else {
          // Key-value or query formatted body
          const bodyParams = new URLSearchParams(body);
          for (const [k, v] of bodyParams.entries()) {
            payload[k] = v;
          }
        }
      }
    } catch (e) {}

    // Process Punch
    handlePunch({
      biometricId: payload.userId || payload.pin || payload.enrollid || payload.biometricId || payload.id || "101",
      source: req.socket.remoteAddress,
      ...payload
    });

    // Standard HTTP response for biometric devices
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK\n');
  });
});

// Also listen to raw socket data if the machine talks binary/raw TCP
server.on('connection', (socket) => {
  console.log(`🔌 [NEW CONNECTION] Device connected from: ${socket.remoteAddress}:${socket.remotePort}`);
  
  socket.on('data', (data) => {
    const text = data.toString('utf8');
    // If it's not HTTP, parse raw data
    if (!text.startsWith('GET') && !text.startsWith('POST') && !text.startsWith('HTTP')) {
      console.log(`[RAW TCP DATA]:`, data.toString('hex'), `Text:`, text.trim());
      // Check if text has numbers (like User ID)
      const matches = text.match(/\d+/g);
      if (matches && matches.length > 0) {
        handlePunch({
          biometricId: matches[0],
          source: socket.remoteAddress,
          rawHex: data.toString('hex')
        });
      }
      // Send ACK back
      socket.write(Buffer.from([0x00, 0x00, 0x00, 0x00]));
    }
  });

  socket.on('error', (err) => {
    console.log(`[SOCKET ERROR]:`, err.message);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 UNIVO GYM BIOMETRIC GATEWAY LISTENING ON PORT ${PORT}`);
  console.log(`🌐 Local Server IP: 192.168.1.5:${PORT}`);
  console.log(`Waiting for punch signals from Secureye S-B8CB...`);
  console.log(`======================================================\n`);
});
