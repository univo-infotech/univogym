import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, setDoc } from "firebase/firestore";
import { db } from "./config";
import { getCachedData, setCachedData } from "../utils/dataCache";

// Sanitize object recursively to remove/convert undefined values which crash Firestore
function sanitizeFirestoreData(data) {
  if (!data || typeof data !== "object") return data;
  const clean = {};
  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) {
      clean[key] = null;
    } else if (val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      clean[key] = sanitizeFirestoreData(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

// --- SUPPLEMENTS & MERCHANDISE (STORE) ---
export async function getSupplements(gymId) {
  const targetGymId = gymId || "univo_main";
  try {
    const colRef = collection(db, `gyms/${targetGymId}/supplements`);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    const snapTop = await getDocs(collection(db, "supplements"));
    if (!snapTop.empty) {
      return snapTop.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (err) {
    console.warn("getSupplements Firestore error:", err);
  }
  return [];
}

export async function addSupplement(gymId, data) {
  const targetGymId = gymId || "univo_main";
  const supId = data.id || ("sup_" + Date.now());
  const clean = sanitizeFirestoreData({
    ...data,
    id: supId,
    createdAt: data.createdAt || new Date().toISOString()
  });

  try {
    const docRef = doc(db, `gyms/${targetGymId}/supplements`, supId);
    await setDoc(docRef, clean, { merge: true });
    await setDoc(doc(db, "supplements", supId), clean, { merge: true });
  } catch (err) {
    console.warn("addSupplement Firestore save error:", err);
  }

  return clean;
}

export async function updateSupplement(gymId, id, data) {
  const targetGymId = gymId || "univo_main";
  const clean = sanitizeFirestoreData({ ...data, id });
  try {
    const docRef = doc(db, `gyms/${targetGymId}/supplements`, id);
    await setDoc(docRef, clean, { merge: true });
    await setDoc(doc(db, "supplements", id), clean, { merge: true });
  } catch (err) {
    console.warn("updateSupplement Firestore update error:", err);
  }

  return { id, ...clean };
}

export async function deleteSupplement(gymId, id) {
  const targetGymId = gymId || "univo_main";
  try {
    const docRef = doc(db, `gyms/${targetGymId}/supplements`, id);
    await deleteDoc(docRef);
    await deleteDoc(doc(db, "supplements", id));
  } catch (err) {
    console.warn("deleteSupplement Firestore delete error:", err);
  }

  return true;
}

// Record a supplement sale: decrements quantity & saves sale entry
export async function sellSupplement(gymId, supplementId, saleData) {
  const targetGymId = gymId || "univo_main";
  const saleId = "sale_" + Date.now();
  const cleanData = sanitizeFirestoreData({
    ...saleData,
    id: saleId,
    supplementId: supplementId || "",
    timestamp: saleData.timestamp || new Date().toISOString()
  });

  // 1. Save sale record to Firestore
  try {
    const salesColRef = collection(db, `gyms/${targetGymId}/supplement_sales`);
    await addDoc(salesColRef, cleanData);
    await addDoc(collection(db, "supplement_sales"), cleanData);
  } catch (err) {
    console.warn("Firestore save sale error:", err);
  }

  // 2. Decrement current stock using setDoc with merge: true
  const currentStock = Number(saleData.currentStock || 0);
  const qtySold = Number(saleData.quantitySold || 1);
  const newStock = Math.max(0, currentStock - qtySold);

  if (supplementId) {
    try {
      const docRef = doc(db, `gyms/${targetGymId}/supplements`, supplementId);
      await setDoc(docRef, { quantity: newStock, inStock: newStock > 0 }, { merge: true });
      await setDoc(doc(db, "supplements", supplementId), { quantity: newStock, inStock: newStock > 0 }, { merge: true });
    } catch (err) {
      console.warn("Firestore update stock error:", err);
    }
  }

  invalidateCache("supplements");
  return { success: true, id: saleId, newStock };
}

export async function getSupplementSales(gymId, forceRefresh = false) {
  const targetGymId = gymId || "univo_main";

  let serverList = [];
  try {
    const colRef = collection(db, `gyms/${targetGymId}/supplement_sales`);
    const snap = await getDocs(colRef);
    serverList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (serverList.length === 0) {
      const snapTop = await getDocs(collection(db, "supplement_sales"));
      serverList = snapTop.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.warn("getSupplementSales error:", e);
  }

  const map = new Map();
  serverList.forEach(s => map.set(s.id, s));

  const list = Array.from(map.values()).sort(
    (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
  );

  return list;
}


// --- GYM MACHINES & EQUIPMENT FLEET ---
export async function getEquipment(gymId) {
  const targetGymId = gymId || "univo_main";
  try {
    const colRef = collection(db, `gyms/${targetGymId}/equipment`);
    const snap = await getDocs(colRef);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn("getEquipment error:", e);
    return [];
  }
}

export async function addEquipment(gymId, data) {
  const targetGymId = gymId || "univo_main";
  const colRef = collection(db, `gyms/${targetGymId}/equipment`);
  return await addDoc(colRef, {
    ...data,
    serviceHistory: data.serviceHistory || [],
    createdAt: new Date().toISOString()
  });
}

export async function updateEquipment(gymId, id, data) {
  const targetGymId = gymId || "univo_main";
  const docRef = doc(db, `gyms/${targetGymId}/equipment`, id);
  return await setDoc(docRef, data, { merge: true });
}

export async function deleteEquipment(gymId, id) {
  const targetGymId = gymId || "univo_main";
  const docRef = doc(db, `gyms/${targetGymId}/equipment`, id);
  return await deleteDoc(docRef);
}

// Log a service/repair: updates lastServiceDate, condition, and appends to serviceHistory
export async function logEquipmentRepair(gymId, id, repairLog, currentHistory = []) {
  const targetGymId = gymId || "univo_main";
  const docRef = doc(db, `gyms/${targetGymId}/equipment`, id);
  const updatedHistory = [
    {
      id: "srv_" + Date.now(),
      date: repairLog.date || new Date().toISOString().split("T")[0],
      cost: Number(repairLog.cost) || 0,
      technician: repairLog.technician || "",
      technicianPhone: repairLog.technicianPhone || "",
      issue: repairLog.issue || "",
      actionTaken: repairLog.actionTaken || "",
      notes: repairLog.notes || ""
    },
    ...currentHistory
  ];

  await setDoc(docRef, {
    lastServiceDate: repairLog.date || new Date().toISOString().split("T")[0],
    condition: repairLog.condition || "Operational",
    serviceHistory: updatedHistory
  }, { merge: true });

  return updatedHistory;
}


// --- LEGACY BACKWARD COMPATIBILITY ---
export async function addStockItem(gymId, itemData) {
  const colRef = collection(db, `gyms/${gymId}/stock`);
  return await addDoc(colRef, {
    ...itemData,
    createdAt: new Date().toISOString()
  });
}

export async function updateStockItem(gymId, itemId, data) {
  const docRef = doc(db, `gyms/${gymId}/stock`, itemId);
  return await updateDoc(docRef, data);
}

export async function deleteStockItem(gymId, itemId) {
  const docRef = doc(db, `gyms/${gymId}/stock`, itemId);
  return await deleteDoc(docRef);
}

export async function getStock(gymId, forceRefresh = false) {
  const targetGymId = gymId || "univo_main";
  const cacheKey = `stock_${targetGymId}`;

  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached && cached.isFresh) {
      return cached.data;
    }
  }

  try {
    const colRef = collection(db, `gyms/${targetGymId}/stock`);
    const snap = await getDocs(colRef);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setCachedData(cacheKey, list);
    return list;
  } catch (e) {
    console.warn("getStock error:", e);
    return [];
  }
}

export async function logServiceDone(gymId, itemId) {
  const docRef = doc(db, `gyms/${gymId}/stock`, itemId);
  return await updateDoc(docRef, {
    lastServiceDate: new Date().toISOString().split("T")[0]
  });
}
