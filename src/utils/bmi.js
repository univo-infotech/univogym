/**
 * Standard WHO BMI Calculator & Height Normalization Utility
 * Formula: BMI = Weight (kg) / (Height in meters)²
 */

export const BMI_CATEGORIES = {
  UNDERWEIGHT: {
    label: "Underweight",
    hindi: "Kam Wajan",
    color: "text-blue-700 bg-blue-50 border-blue-200",
    badgeColor: "bg-blue-600 text-white",
    advice: "Caloric surplus & progressive strength training recommended",
  },
  NORMAL: {
    label: "Normal Weight (Healthy)",
    hindi: "Sahi Wajan",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    badgeColor: "bg-emerald-600 text-white",
    advice: "Optimal range for lean muscle building and stamina",
  },
  OVERWEIGHT: {
    label: "Overweight",
    hindi: "Adhik Wajan",
    color: "text-amber-700 bg-amber-50 border-amber-200",
    badgeColor: "bg-amber-600 text-white",
    advice: "Caloric deficit, HIIT & clean nutrition recommended",
  },
  OBESE: {
    label: "Obese",
    hindi: "Motapa",
    color: "text-rose-700 bg-rose-50 border-rose-200",
    badgeColor: "bg-rose-600 text-white",
    advice: "Structured weight management & cardio guidance advised",
  },
};

/**
 * Parses height in any format to meters accurately
 * @param {string|number} heightStr 
 * @param {string|number} [feet] 
 * @param {string|number} [inches] 
 * @param {string|number} [cm] 
 * @returns {number|null} height in meters
 */
export function parseHeightToMeters(heightStr, feet, inches, cm) {
  // 1. If cm explicitly given
  if (cm && Number(cm) > 0) {
    return Number(cm) / 100;
  }

  // 2. If feet & inches given
  if (feet !== undefined && feet !== null && String(feet).trim() !== "") {
    let ft = parseFloat(feet);
    let inch = parseFloat(inches || 0);
    if (!isNaN(ft) && ft > 0) {
      // Handle user typing "5.8" or "5.10" into feet input
      if (String(feet).includes(".") && (inch === 0 || isNaN(inch))) {
        const parts = String(feet).split(".");
        ft = parseInt(parts[0], 10);
        inch = parseFloat(parts[1]);
        // If someone typed "5.8", parts[1] is "8" -> 8 inches
        if (parts[1].length === 1 && inch < 12) {
          // e.g. 5.8 is 5 ft 8 in
        } else if (inch >= 12) {
          // If decimal is like 5.75, treat as 0.75 feet
          inch = parseFloat("0." + parts[1]) * 12;
        }
      }
      const totalInches = ft * 12 + (isNaN(inch) ? 0 : inch);
      return totalInches * 0.0254;
    }
  }

  // 3. If heightStr given
  if (heightStr) {
    const s = String(heightStr).trim().toLowerCase();
    
    // Check if "5 ft 8 in" or "5'8" or "5ft 8in"
    if (s.includes("ft") || s.includes("'")) {
      const ftMatch = s.match(/(\d+)\s*(?:ft|')/);
      const inMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:in|")/);
      const ft = ftMatch ? parseInt(ftMatch[1], 10) : 0;
      const inch = inMatch ? parseFloat(inMatch[1]) : 0;
      if (ft > 0) {
        return (ft * 12 + inch) * 0.0254;
      }
    }

    // Number with "cm"
    if (s.includes("cm")) {
      const cmVal = parseFloat(s.replace(/[^\d.]/g, ""));
      if (cmVal > 0) return cmVal / 100;
    }

    // Raw numbers
    const num = parseFloat(s);
    if (!isNaN(num) && num > 0) {
      if (num >= 80 && num <= 260) {
        // Centimeters (e.g. 172)
        return num / 100;
      } else if (num >= 0.8 && num <= 2.6) {
        // Already in meters
        return num;
      } else if (num >= 3 && num <= 8) {
        // Feet (e.g. 5.8)
        const ft = Math.floor(num);
        const dec = Math.round((num - ft) * 10);
        return (ft * 12 + dec) * 0.0254;
      }
    }
  }

  return null;
}

/**
 * Computes BMI, WHO category, and Ideal Weight Range
 * @param {Object} params { weight, heightFeet, heightInches, heightCm, heightUnit }
 * @returns {Object|null}
 */
export function calculateBmi({ weight, heightFeet, heightInches, heightCm, heightUnit = "ft" }) {
  const w = parseFloat(weight);
  if (!w || isNaN(w) || w <= 10 || w >= 350) {
    return null;
  }

  let hM = null;
  if (heightUnit === "cm") {
    hM = parseHeightToMeters(null, null, null, heightCm);
  } else {
    hM = parseHeightToMeters(null, heightFeet, heightInches, null);
  }

  if (!hM || hM <= 0.5 || hM >= 2.6) {
    return null;
  }

  // Exact BMI value rounded to 1 decimal
  const rawBmi = w / (hM * hM);
  const val = parseFloat(rawBmi.toFixed(1));

  let category = BMI_CATEGORIES.NORMAL.label;
  let categoryMeta = BMI_CATEGORIES.NORMAL;

  if (val < 18.5) {
    category = BMI_CATEGORIES.UNDERWEIGHT.label;
    categoryMeta = BMI_CATEGORIES.UNDERWEIGHT;
  } else if (val <= 24.9) {
    category = BMI_CATEGORIES.NORMAL.label;
    categoryMeta = BMI_CATEGORIES.NORMAL;
  } else if (val <= 29.9) {
    category = BMI_CATEGORIES.OVERWEIGHT.label;
    categoryMeta = BMI_CATEGORIES.OVERWEIGHT;
  } else {
    category = BMI_CATEGORIES.OBESE.label;
    categoryMeta = BMI_CATEGORIES.OBESE;
  }

  // Ideal weight range based on normal BMI (18.5 - 24.9) for this height
  const idealMin = parseFloat((18.5 * hM * hM).toFixed(1));
  const idealMax = parseFloat((24.9 * hM * hM).toFixed(1));

  // Height representations
  const totalInches = Math.round(hM / 0.0254);
  const computedFt = Math.floor(totalInches / 12);
  const computedIn = totalInches % 12;
  const computedCm = Math.round(hM * 100);

  return {
    val,
    category,
    color: categoryMeta.color,
    badgeColor: categoryMeta.badgeColor,
    message: categoryMeta.advice,
    heightM: parseFloat(hM.toFixed(2)),
    heightCm: computedCm,
    heightFtIn: `${computedFt} ft ${computedIn} in`,
    idealMin,
    idealMax,
    idealRangeText: `${idealMin} kg – ${idealMax} kg`,
  };
}
