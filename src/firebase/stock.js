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
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      try {
        localStorage.setItem(`univo_supplements_${targetGymId}`, JSON.stringify(list));
      } catch (e) {}
      return list;
    }
  } catch (err) {
    console.warn("getSupplements firestore error, falling back to local storage:", err);
  }

  try {
    const local = localStorage.getItem(`univo_supplements_${targetGymId}`);
    if (local) return JSON.parse(local);
  } catch (e) {}
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
  } catch (err) {
    console.warn("addSupplement offline save fallback:", err);
  }

  try {
    const local = localStorage.getItem(`univo_supplements_${targetGymId}`);
    const list = local ? JSON.parse(local) : [];
    localStorage.setItem(`univo_supplements_${targetGymId}`, JSON.stringify([clean, ...list.filter(x => x.id !== supId)]));
  } catch (e) {}

  return clean;
}

export async function updateSupplement(gymId, id, data) {
  const targetGymId = gymId || "univo_main";
  const clean = sanitizeFirestoreData({ ...data, id });
  try {
    const docRef = doc(db, `gyms/${targetGymId}/supplements`, id);
    await setDoc(docRef, clean, { merge: true });
  } catch (err) {
    console.warn("updateSupplement offline save fallback:", err);
  }

  try {
    const local = localStorage.getItem(`univo_supplements_${targetGymId}`);
    if (local) {
      const list = JSON.parse(local);
      const updated = list.map(item => item.id === id ? { ...item, ...clean } : item);
      localStorage.setItem(`univo_supplements_${targetGymId}`, JSON.stringify(updated));
    }
  } catch (e) {}

  return { id, ...clean };
}

export async function deleteSupplement(gymId, id) {
  const targetGymId = gymId || "univo_main";
  try {
    const docRef = doc(db, `gyms/${targetGymId}/supplements`, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("deleteSupplement offline fallback:", err);
  }

  try {
    const local = localStorage.getItem(`univo_supplements_${targetGymId}`);
    if (local) {
      const list = JSON.parse(local).filter(item => item.id !== id);
      localStorage.setItem(`univo_supplements_${targetGymId}`, JSON.stringify(list));
    }
  } catch (e) {}

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
  } catch (err) {
    console.warn("Firestore save sale fallback to local cache:", err);
  }

  // 2. Decrement current stock using setDoc with merge: true (never crashes if doc is missing)
  const currentStock = Number(saleData.currentStock || 0);
  const qtySold = Number(saleData.quantitySold || 1);
  const newStock = Math.max(0, currentStock - qtySold);

  if (supplementId) {
    try {
      const docRef = doc(db, `gyms/${targetGymId}/supplements`, supplementId);
      await setDoc(docRef, { quantity: newStock, inStock: newStock > 0 }, { merge: true });
    } catch (err) {
      console.warn("Firestore update stock fallback:", err);
    }

    // Also update local storage supplements
    try {
      const local = localStorage.getItem(`univo_supplements_${targetGymId}`);
      if (local) {
        const list = JSON.parse(local);
        const updated = list.map(item =>
          item.id === supplementId ? { ...item, quantity: newStock, inStock: newStock > 0 } : item
        );
        localStorage.setItem(`univo_supplements_${targetGymId}`, JSON.stringify(updated));
      }
    } catch (e) {}
  }

  // 3. Save sale locally in cache and localStorage
  try {
    const cacheKey = `supplements_sales_${targetGymId}`;
    const cached = getCachedData(cacheKey)?.data || [];
    setCachedData(cacheKey, [cleanData, ...cached]);

    const localSales = localStorage.getItem(`univo_sales_${targetGymId}`);
    const list = localSales ? JSON.parse(localSales) : [];
    localStorage.setItem(`univo_sales_${targetGymId}`, JSON.stringify([cleanData, ...list]));
  } catch (e) {}

  return { success: true, id: saleId, newStock };
}

export async function getSupplementSales(gymId, forceRefresh = false) {
  const targetGymId = gymId || "univo_main";
  const cacheKey = `supplements_sales_${targetGymId}`;

  let serverList = [];
  try {
    const colRef = collection(db, `gyms/${targetGymId}/supplement_sales`);
    const snap = await getDocs(colRef);
    serverList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn("getSupplementSales error:", e);
  }

  let localList = [];
  try {
    const raw = localStorage.getItem(`univo_sales_${targetGymId}`);
    if (raw) localList = JSON.parse(raw);
  } catch (e) {}

  const map = new Map();
  serverList.forEach(s => map.set(s.id, s));
  localList.forEach(s => {
    if (!map.has(s.id)) map.set(s.id, s);
  });

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
  );

  setCachedData(cacheKey, merged);
  return merged;
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
