import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where, writeBatch } from "firebase/firestore";
import { db } from "./config";
import { getCachedData, setCachedData } from "../utils/dataCache";

export async function addExpense(gymId, expenseData) {
  const colRef = collection(db, `gyms/${gymId}/expenses`);
  return await addDoc(colRef, {
    ...expenseData,
    createdAt: new Date().toISOString()
  });
}

export async function updateExpense(gymId, expenseId, data) {
  const docRef = doc(db, `gyms/${gymId}/expenses`, expenseId);
  return await updateDoc(docRef, data);
}

export async function deleteExpense(gymId, expenseId) {
  const docRef = doc(db, `gyms/${gymId}/expenses`, expenseId);
  return await deleteDoc(docRef);
}

/**
 * Get all expenses with automated recurring expense generation.
 * If an active recurring expense exists and hasn't been generated for a month,
 * this function detects and creates those entries automatically.
 */
export async function getExpenses(gymId, forceRefresh = false) {
  const targetGymId = gymId || "univo_main";
  const cacheKey = `expenses_${targetGymId}`;

  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached && cached.isFresh) {
      return cached.data;
    }
  }

  const colRef = collection(db, `gyms/${targetGymId}/expenses`);
  const q = query(colRef, orderBy("date", "desc"));
  const snap = await getDocs(q);
  let expensesList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Check recurring templates and automatically create monthly entries if due
  try {
    const recurringTemplates = expensesList.filter(
      (e) => e.type === "monthly" && e.isRecurringTemplate === true && e.isActive !== false
    );

    if (recurringTemplates.length > 0) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-indexed

      let newlyCreated = [];

      for (const tpl of recurringTemplates) {
        // Find start date of template
        const tplStartDate = tpl.startDate || tpl.date || new Date().toISOString().split("T")[0];
        const [sYear, sMonth] = tplStartDate.split("-").map(Number);
        const billDay = tpl.dayOfMonth || Number(tplStartDate.split("-")[2]) || 1;

        // Iterate from start month up to current month (limit to last 12 months max to avoid unbounded loops)
        let curY = sYear;
        let curM = sMonth - 1; // 0-indexed

        while (curY < currentYear || (curY === currentYear && curM <= currentMonth)) {
          const formattedM = String(curM + 1).padStart(2, "0");
          const targetMonthKey = `${curY}-${formattedM}`;
          
          // Construct entry date (clamp to month max days)
          const daysInMonth = new Date(curY, curM + 1, 0).getDate();
          const actualDay = Math.min(billDay, daysInMonth);
          const entryDate = `${targetMonthKey}-${String(actualDay).padStart(2, "0")}`;

          // Check if instance already exists
          const exists = expensesList.some(
            (e) =>
              (e.templateId === tpl.id && e.date.startsWith(targetMonthKey)) ||
              (e.id === tpl.id && e.date.startsWith(targetMonthKey))
          );

          if (!exists) {
            const newEntry = {
              title: tpl.title,
              category: tpl.category || "General",
              amount: Number(tpl.amount) || 0,
              type: "monthly",
              isRecurringInstance: true,
              templateId: tpl.id,
              date: entryDate,
              status: "auto_generated",
              notes: tpl.notes ? `Auto-billed: ${tpl.notes}` : "Automated monthly recurring expense",
              createdAt: new Date().toISOString()
            };

            const createdRef = await addDoc(colRef, newEntry);
            newlyCreated.push({ id: createdRef.id, ...newEntry });
          }

          // Advance one month
          curM++;
          if (curM > 11) {
            curM = 0;
            curY++;
          }
        }
      }

      if (newlyCreated.length > 0) {
        expensesList = [...newlyCreated, ...expensesList].sort((a, b) => (b.date > a.date ? 1 : -1));
      }
    }
  } catch (err) {
    console.warn("Auto-recurring expense evaluation skipped:", err);
  }

  setCachedData(cacheKey, expensesList);
  return expensesList;
}

/**
 * Toggle recurring template active / paused state
 */
export async function toggleRecurringExpense(gymId, templateId, isActive) {
  const targetGymId = gymId || "univo_main";
  const docRef = doc(db, `gyms/${targetGymId}/expenses`, templateId);
  return await updateDoc(docRef, {
    isActive,
    updatedAt: new Date().toISOString()
  });
}
