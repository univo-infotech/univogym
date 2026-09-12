import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "./config";

// --- SUPPLEMENTS & MERCHANDISE (STORE) ---
export async function getSupplements(gymId) {
  const colRef = collection(db, `gyms/${gymId}/supplements`);
  const snap = await getDocs(colRef);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addSupplement(gymId, data) {
  const colRef = collection(db, `gyms/${gymId}/supplements`);
  return await addDoc(colRef, {
    ...data,
    createdAt: new Date().toISOString()
  });
}

export async function updateSupplement(gymId, id, data) {
  const docRef = doc(db, `gyms/${gymId}/supplements`, id);
  return await updateDoc(docRef, data);
}

export async function deleteSupplement(gymId, id) {
  const docRef = doc(db, `gyms/${gymId}/supplements`, id);
  return await deleteDoc(docRef);
}

// Record a supplement sale: decrements quantity & saves sale entry
export async function sellSupplement(gymId, supplementId, saleData) {
  const docRef = doc(db, `gyms/${gymId}/supplements`, supplementId);
  const salesColRef = collection(db, `gyms/${gymId}/supplement_sales`);
  
  // Save sale record
  await addDoc(salesColRef, {
    ...saleData,
    supplementId,
    timestamp: new Date().toISOString()
  });

  // Decrement current stock
  const newStock = Math.max(0, (saleData.currentStock || 0) - (saleData.quantitySold || 1));
  await updateDoc(docRef, {
    quantity: newStock
  });

  return { success: true, newStock };
}

export async function getSupplementSales(gymId) {
  const colRef = collection(db, `gyms/${gymId}/supplement_sales`);
  const snap = await getDocs(colRef);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}


// --- GYM MACHINES & EQUIPMENT FLEET ---
export async function getEquipment(gymId) {
  const colRef = collection(db, `gyms/${gymId}/equipment`);
  const snap = await getDocs(colRef);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addEquipment(gymId, data) {
  const colRef = collection(db, `gyms/${gymId}/equipment`);
  return await addDoc(colRef, {
    ...data,
    serviceHistory: data.serviceHistory || [],
    createdAt: new Date().toISOString()
  });
}

export async function updateEquipment(gymId, id, data) {
  const docRef = doc(db, `gyms/${gymId}/equipment`, id);
  return await updateDoc(docRef, data);
}

export async function deleteEquipment(gymId, id) {
  const docRef = doc(db, `gyms/${gymId}/equipment`, id);
  return await deleteDoc(docRef);
}

// Log a service/repair: updates lastServiceDate, condition, and appends to serviceHistory
export async function logEquipmentRepair(gymId, id, repairLog, currentHistory = []) {
  const docRef = doc(db, `gyms/${gymId}/equipment`, id);
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

  await updateDoc(docRef, {
    lastServiceDate: repairLog.date || new Date().toISOString().split("T")[0],
    condition: repairLog.condition || "Operational",
    serviceHistory: updatedHistory
  });

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

export async function getStock(gymId) {
  const colRef = collection(db, `gyms/${gymId}/stock`);
  const snap = await getDocs(colRef);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function logServiceDone(gymId, itemId) {
  const docRef = doc(db, `gyms/${gymId}/stock`, itemId);
  return await updateDoc(docRef, {
    lastServiceDate: new Date().toISOString().split("T")[0]
  });
}
