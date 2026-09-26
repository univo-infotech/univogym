/**
 * Standardized Date Formatting Utilities for Univo Gym Management
 * Enforces DD/MM/YYYY across all UI components, invoices, receipts, and tables.
 */

/**
 * Format any date input into DD/MM/YYYY
 * Handles YYYY-MM-DD, ISO timestamps, Date objects, Firestore timestamps, and unix epoch.
 * Direct parsing of date strings avoids timezone day-shifting bugs.
 * 
 * @param {string|number|Date|object} val 
 * @param {string} fallback 
 * @returns {string} Date formatted as DD/MM/YYYY (e.g. 26/09/2026)
 */
export function formatDate(val, fallback = "-") {
  if (!val && val !== 0) return fallback;

  // Handle Firestore Timestamp object ({ seconds, nanoseconds } or { toDate: fn })
  if (typeof val === "object" && val !== null) {
    if (typeof val.toDate === "function") {
      val = val.toDate();
    } else if (typeof val.seconds === "number") {
      val = new Date(val.seconds * 1000);
    }
  }

  // Handle standard Date object
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return fallback;
    const d = String(val.getDate()).padStart(2, "0");
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const y = val.getFullYear();
    return `${d}/${m}/${y}`;
  }

  // Handle String
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || trimmed === "N/A" || trimmed === "--" || trimmed === "-") return fallback;

    // Already in DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }

    // In DD-MM-YYYY format -> convert to DD/MM/YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      return trimmed.replace(/-/g, "/");
    }

    // In YYYY-MM-DD format (or YYYY-MM-DDTHH:mm:ss...)
    // Direct slice to avoid UTC day-offset shifts
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const parts = trimmed.slice(0, 10).split("-");
      if (parts.length === 3) {
        const [y, m, d] = parts;
        return `${d}/${m}/${y}`;
      }
    }

    // Try parsing as Date
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const d = String(parsed.getDate()).padStart(2, "0");
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const y = parsed.getFullYear();
      return `${d}/${m}/${y}`;
    }
  }

  // Handle numeric epoch timestamp (ms or seconds)
  if (typeof val === "number") {
    // If it's in seconds (e.g. 1727360000), convert to ms
    const ms = val < 1e11 ? val * 1000 : val;
    const parsed = new Date(ms);
    if (!isNaN(parsed.getTime())) {
      const d = String(parsed.getDate()).padStart(2, "0");
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const y = parsed.getFullYear();
      return `${d}/${m}/${y}`;
    }
  }

  return fallback;
}

/**
 * Format date & time into DD/MM/YYYY, hh:mm A
 */
export function formatDateTime(val, fallback = "-") {
  if (!val && val !== 0) return fallback;
  const datePart = formatDate(val, "");
  if (!datePart) return fallback;

  let dObj = null;
  if (typeof val === "object" && val !== null) {
    if (typeof val.toDate === "function") dObj = val.toDate();
    else if (typeof val.seconds === "number") dObj = new Date(val.seconds * 1000);
    else if (val instanceof Date) dObj = val;
  } else if (typeof val === "number") {
    dObj = new Date(val < 1e11 ? val * 1000 : val);
  } else if (typeof val === "string") {
    dObj = new Date(val);
  }

  if (dObj && !isNaN(dObj.getTime())) {
    const timeStr = dObj.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${datePart}, ${timeStr}`;
  }

  return datePart;
}

/**
 * Today's date in DD/MM/YYYY
 */
export function todayFormatted() {
  return formatDate(new Date());
}

/**
 * Universal Date Parser
 * Safely parses any date representation (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD,
 * Firestore Timestamp, ISO string, epoch number, Date instance) into a valid Date object.
 * Returns null if invalid or missing.
 *
 * @param {any} val
 * @returns {Date|null}
 */
export function parseToDate(val) {
  if (!val && val !== 0) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  // Handle Firestore Timestamp or object with seconds / toDate
  if (typeof val === "object" && val !== null) {
    if (typeof val.toDate === "function") return val.toDate();
    if (typeof val.seconds === "number") return new Date(val.seconds * 1000);
  }

  // Handle numeric epoch timestamp (ms or seconds)
  if (typeof val === "number") {
    const ms = val < 1e11 ? val * 1000 : val;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || trimmed === "N/A" || trimmed === "-" || trimmed === "--") return null;

    // DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      const year = parseInt(ddmmyyyy[3], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }

    // YYYY-MM-DD or YYYY/MM/DD
    const yyyymmdd = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (yyyymmdd) {
      const year = parseInt(yyyymmdd[1], 10);
      const month = parseInt(yyyymmdd[2], 10) - 1;
      const day = parseInt(yyyymmdd[3], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }

    // Standard ISO / JS string fallback
    const standard = new Date(trimmed);
    return isNaN(standard.getTime()) ? null : standard;
  }

  return null;
}

