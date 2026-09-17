import jsPDF from "jspdf";
import { getGymSettings } from "./settings";

export function generatePaymentReceipt(payment, customSettings = null) {
  const settings = customSettings || getGymSettings();
  const doc = new jsPDF();

  // 1. Header branding banner
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, 210, 28, "F");

  // Logo embedding in top banner
  if (settings.logoUrl && settings.logoUrl.startsWith("data:image")) {
    try {
      const format = settings.logoUrl.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(settings.logoUrl, format, 12, 3, 22, 22);
    } catch (e) {
      try {
        doc.addImage(settings.logoUrl, 12, 3, 22, 22);
      } catch (err) {
        console.warn("Logo image embed failed in receipt:", err);
      }
    }
  }

  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text((settings.gymName || "UNIVO GYM MANAGEMENT").toUpperCase(), 105, 12, { align: "center" });

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(settings.tagline || "Stronger Today, Healthier Tomorrow", 105, 18, { align: "center" });
  doc.text(
    `Tel: ${settings.phone || "+91 9196302375"} | Branch: ${settings.address || "Main Branch"}`,
    105,
    24,
    { align: "center" }
  );

  // 2. Receipt Title
  const isPtBill = Boolean(
    payment.isPtOnly ||
    payment.planType === "PT" ||
    (Number(payment.ptPlanPrice || 0) > 0 && Number(payment.planPrice || 0) === 0) ||
    (payment.planName && payment.planName.toLowerCase().startsWith("personal training") && !payment.planName.includes("+"))
  );

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(isPtBill ? "OFFICIAL PERSONAL TRAINING (PT) TAX INVOICE" : "OFFICIAL MEMBERSHIP RECEIPT & TAX INVOICE", 105, 38, { align: "center" });

  // 3. Receipt Meta box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 43, 180, 24, 3, 3, "FD");

  const receiptNo = payment.receiptNo || payment.id || `INV-${Date.now().toString().slice(-6)}`;
  const payDate = payment.date || new Date().toLocaleDateString("en-IN");
  const isPartial = Number(payment.dueAmount) > 0;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text(`Receipt No: ${receiptNo}`, 22, 51);
  doc.text(`Invoice Date: ${payDate}`, 125, 51);

  doc.setFont("helvetica", "normal");
  const modeLabel = payment.paymentMode === "split" ? "SPLIT (CASH + UPI)" : (payment.paymentMode || "CASH").toUpperCase();
  doc.text(`Payment Mode: ${modeLabel}`, 22, 57);
  doc.text(`Payment Status: ${isPartial ? "PARTIAL PAYMENT (DUES PENDING)" : "FULL PAYMENT (CLEARED)"}`, 125, 57);

  if (payment.remarks || payment.reference || (payment.cashAmount && payment.onlineAmount)) {
    const refText = payment.cashAmount && payment.onlineAmount 
      ? `Cash: Rs. ${payment.cashAmount} | UPI: Rs. ${payment.onlineAmount}`
      : (payment.remarks || payment.reference || "");
    doc.text(`Ref / Remarks: ${refText.slice(0, 65)}`, 22, 63);
  }

  // 4. Member Information Card
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 70, 180, 20, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("MEMBER DETAILS:", 22, 77);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(`Name: ${payment.memberName || "Athlete"}`, 22, 84);
  doc.text(`Phone: ${payment.phone || "—"}`, 85, 84);
  doc.text(`Slot/Batch: ${payment.slot || payment.batch || "General Floor"}`, 140, 84);

  // 5. Billing Particulars Table Header
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 94, 180, 8, "FD");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Particulars / Service Description", 20, 99.5);
  doc.text("Validity Period", 100, 99.5);
  doc.text("Amount (INR)", 165, 99.5);

  const validityText = (payment.validityStart && payment.validityEnd)
    ? `${payment.validityStart} to ${payment.validityEnd}`
    : payment.validity || "Active Validity";

  // Build itemized list of particulars
  const items = [];
  const paidTotal = Number(payment.paidAmount || payment.amount || 0);
  const totalPlanPrice = Number(payment.amount || payment.paidAmount || 0);
  const basePrice = Number(payment.planPrice || 0);
  const ptPrice = Number(payment.ptPlanPrice || payment.ptFee || 0);
  const servicesPrice = Number(payment.servicesPrice || payment.servicesTotalPrice || 0);

  // 1) Base Plan or Dedicated PT Item
  if (isPtBill) {
    items.push({
      desc: `Personal Training (PT) - ${payment.ptPlanName || payment.planName?.replace(/^Personal Training \(PT\) - /i, '') || "1-on-1 PT"}${payment.trainerName ? ` (Coach: ${payment.trainerName})` : ""}`,
      period: validityText,
      amount: totalPlanPrice
    });
  } else {
    const baseTitle = payment.planName ? payment.planName.split("+")[0].trim() : "Gym Membership Base Fee";
    const finalBasePrice = basePrice > 0 ? basePrice : Math.max(0, totalPlanPrice - ptPrice - servicesPrice);
    items.push({
      desc: `Base Membership: ${baseTitle}`,
      period: validityText,
      amount: finalBasePrice
    });

    // 2) Personal Trainer (PT) Item
    if (ptPrice > 0 || (payment.ptPlanName && !payment.planName?.toLowerCase().includes("services only"))) {
      items.push({
        desc: `Personal Training (PT)${payment.ptPlanName ? ` - ${payment.ptPlanName}` : ""}${payment.trainerName ? ` (Coach: ${payment.trainerName})` : ""}`,
        period: validityText,
        amount: ptPrice
      });
    }
  }

  // 3) Add-on Services Items
  if (Array.isArray(payment.selectedServices) && payment.selectedServices.length > 0) {
    payment.selectedServices.forEach((s) => {
      items.push({
        desc: `Add-on Service: ${s.name}${s.billingType ? ` (${s.billingType})` : ""}`,
        period: validityText,
        amount: Number(s.price || 0)
      });
    });
  } else if (servicesPrice > 0 || (payment.planName && payment.planName.includes("Services ("))) {
    const sMatch = payment.planName ? payment.planName.match(/\+\s*Services\s*\((.*?)\)/i) : null;
    const sName = sMatch && sMatch[1] ? sMatch[1].trim() : "Add-on Gym Services";
    items.push({
      desc: `Add-on Service: ${sName}`,
      period: validityText,
      amount: servicesPrice
    });
  }

  // Draw Table Rows
  let startY = 107;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  items.forEach((item, idx) => {
    const currentItemY = startY + idx * 6.5;
    doc.text(item.desc.slice(0, 48), 20, currentItemY);
    doc.text(item.period, 100, currentItemY);
    doc.setFont("helvetica", "bold");
    doc.text(`Rs. ${Number(item.amount).toLocaleString("en-IN")}`, 165, currentItemY);
    doc.setFont("helvetica", "normal");
  });

  const tableBottomY = startY + items.length * 6.5 + 2;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, tableBottomY, 195, tableBottomY);

  // 6. Summary Box
  let summaryY = tableBottomY + 5;
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  if (isPtBill) {
    doc.text("PT Package Fee:", 120, summaryY);
    doc.text(`Rs. ${totalPlanPrice.toLocaleString("en-IN")}`, 172, summaryY);
    summaryY += 5;
  } else {
    doc.text("Plan Base Fee:", 120, summaryY);
    doc.text(`Rs. ${finalBasePrice.toLocaleString("en-IN")}`, 172, summaryY);
    summaryY += 5;

    if (ptPrice > 0) {
      doc.text("Personal Training (PT):", 120, summaryY);
      doc.text(`+ Rs. ${ptPrice.toLocaleString("en-IN")}`, 172, summaryY);
      summaryY += 5;
    }
  }

  if (servicesPrice > 0) {
    doc.text("Add-on Services:", 120, summaryY);
    doc.text(`+ Rs. ${servicesPrice.toLocaleString("en-IN")}`, 172, summaryY);
    summaryY += 5;
  }

  if (Number(payment.discount) > 0) {
    doc.text("Special Discount:", 120, summaryY);
    doc.text(`- Rs. ${Number(payment.discount).toLocaleString("en-IN")}`, 172, summaryY);
    summaryY += 5;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Total Package Bill:", 120, summaryY);
  doc.text(`Rs. ${totalPlanPrice.toLocaleString("en-IN")}`, 172, summaryY);
  summaryY += 5.5;

  doc.setTextColor(16, 185, 129);
  doc.text("Amount Received:", 120, summaryY);
  doc.text(`Rs. ${paidTotal.toLocaleString("en-IN")}`, 172, summaryY);
  summaryY += 5;

  const remainingDue = Number(payment.dueAmount || 0);
  if (remainingDue > 0) {
    doc.setTextColor(225, 29, 72);
    doc.text("Pending Balance Due:", 120, summaryY);
    doc.text(`Rs. ${remainingDue.toLocaleString("en-IN")}`, 172, summaryY);
    summaryY += 5;
  }

  // 7. Terms & Conditions Box
  const tcY = Math.max(summaryY + 5, 160);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, tcY, 180, 20, 2, 2);
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("TERMS & CONDITIONS:", 20, tcY + 5);
  doc.setFont("helvetica", "normal");
  doc.text("1. Fees once paid is strictly non-refundable and non-transferable under any circumstances.", 20, tcY + 10);
  doc.text("2. Please present this official receipt or member QR upon entering the fitness facility.", 20, tcY + 15);

  // 8. Signature Block & Stamp
  const sigY = tcY + 26;
  if (settings.signatureUrl && settings.signatureUrl.startsWith("data:image")) {
    try {
      doc.addImage(settings.signatureUrl, "PNG", 135, sigY - 10, 40, 15);
    } catch (e) {
      console.warn("Signature image embed failed:", e);
    }
  }

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text(settings.ownerSignatureName || "Authorized Signatory", 155, sigY + 12, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(settings.ownerSignatureTitle || "Gym Manager / Owner", 155, sigY + 17, { align: "center" });
  doc.setDrawColor(148, 163, 184);
  doc.line(130, sigY + 7, 180, sigY + 7);

  // Stamp circle simulation
  doc.setDrawColor(16, 185, 129);
  doc.circle(45, sigY + 6, 12);
  doc.setTextColor(16, 185, 129);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("VERIFIED & PAID", 45, sigY + 5, { align: "center" });
  doc.text((settings.gymName || "UNIVO GYM").slice(0, 15).toUpperCase(), 45, sigY + 9, { align: "center" });

  // 9. Footer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`This is a computer-generated tax invoice issued by ${settings.gymName || "UNIVO GYM MANAGEMENT"}.`, 105, 280, { align: "center" });

  const safeName = (payment.memberName || "Member").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Receipt_${safeName}_${payDate.replace(/\//g, "-")}.pdf`);
}
/**
 * Generate and download a comprehensive Financial Statement PDF
 * containing Gym Logo, Name, Address, Phone, Period summary, P&L breakdown, and itemized ledger.
 */
export function generateFinancialStatementPDF({
  periodType = "daily", // "daily", "monthly", "custom"
  periodLabel = "",     // e.g. "12 Sep 2026", "September 2026", "01/01/2026 to 12/09/2026"
  totalRevenue = 0,
  grossRevenue = 0,
  trainerPayoutLiability = 0,
  gymNetRevenue = 0,
  totalExpenses = 0,
  netProfit = 0,
  revenueItems = [],
  expenseItems = [],
  supplementRevenue = 0,
  activeMembersCount = 0,
  newEnrollmentsCount = 0
}, customSettings = null) {
  const settings = customSettings || getGymSettings();
  const doc = new jsPDF();

  const finalGross = grossRevenue || totalRevenue || 0;
  const finalNetRev = gymNetRevenue || (finalGross - trainerPayoutLiability);

  // 1. Header Branding Top Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, "F");

  // Emerald accent stripe
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 32, 210, 2.5, "F");

  // Logo if dataUrl provided
  if (settings.logoUrl && settings.logoUrl.startsWith("data:image")) {
    try {
      const format = settings.logoUrl.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(settings.logoUrl, format, 14, 5, 22, 22);
    } catch (e) {
      try {
        doc.addImage(settings.logoUrl, 14, 5, 22, 22);
      } catch (err) {
        console.warn("Logo embed failed:", err);
      }
    }
  }

  // Gym Name & Tagline
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text((settings.gymName || "UNIVO GYM MANAGEMENT").toUpperCase(), 105, 12, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(settings.tagline || "Stronger Today, Healthier Tomorrow", 105, 18, { align: "center" });
  doc.text(
    `Tel: ${settings.phone || "+91 9196302375"}  |  Address: ${settings.address || "Main Fitness Centre"}`,
    105,
    24,
    { align: "center" }
  );

  // 2. Title & Statement Period
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const typeTitle = periodType === "daily" ? "DAILY AUDIT & CASHFLOW STATEMENT" : periodType === "monthly" ? "MONTHLY P&L FINANCIAL STATEMENT" : "CUSTOM PERIOD / LIFETIME AUDIT REPORT";
  doc.text(typeTitle, 105, 43, { align: "center" });

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129);
  doc.text(`STATEMENT DURATION: ${periodLabel.toUpperCase()}`, 105, 49, { align: "center" });

  // 3. Meta info box (Generated date & auditor)
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 53, 182, 12, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated On: ${new Date().toLocaleString("en-IN")}`, 18, 60.5);
  doc.text(`Audited By: ${settings.ownerSignatureName || "Authorized Administrator"}`, 110, 60.5);

  // 4. Financial KPI Summary Cards
  // Total Revenue / Gross Collections Box
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, 69, 58, 24, 2, 2, "FD");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 101, 52);
  doc.text(trainerPayoutLiability > 0 ? "GROSS COLLECTIONS" : "TOTAL GROSS REVENUE", 18, 76);
  doc.setFontSize(13);
  doc.text(`Rs. ${Number(finalGross).toLocaleString("en-IN")}`, 18, 86);

  // Second Box: Coach Liability OR Total Expenses
  if (trainerPayoutLiability > 0) {
    doc.setFillColor(255, 251, 235); // amber-50
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(76, 69, 58, 24, 2, 2, "FD");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 83, 9);
    doc.text("COACH PAYOUT LIABILITY", 80, 76);
    doc.setFontSize(13);
    doc.text(`Rs. ${Number(trainerPayoutLiability).toLocaleString("en-IN")}`, 80, 86);
  } else {
    doc.setFillColor(255, 241, 242); // rose-50
    doc.setDrawColor(254, 205, 211);
    doc.roundedRect(76, 69, 58, 24, 2, 2, "FD");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(159, 18, 57);
    doc.text("TOTAL EXPENSES / OVERHEAD", 80, 76);
    doc.setFontSize(13);
    doc.text(`Rs. ${Number(totalExpenses).toLocaleString("en-IN")}`, 80, 86);
  }

  // Net Profit Box
  const isProfitable = netProfit >= 0;
  if (isProfitable) {
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(153, 246, 228);
  } else {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
  }
  doc.roundedRect(138, 69, 58, 24, 2, 2, "FD");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  if (isProfitable) {
    doc.setTextColor(17, 94, 89);
  } else {
    doc.setTextColor(185, 28, 28);
  }
  doc.text(isProfitable ? "NET OPERATING PROFIT" : "NET OPERATING DEFICIT", 142, 76);
  doc.setFontSize(13);
  doc.text(`Rs. ${Number(netProfit).toLocaleString("en-IN")}`, 142, 86);

  // 5. Operational Metrics Row
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, 97, 182, 11, 1, 1, "FD");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  if (trainerPayoutLiability > 0) {
    doc.text(`Gym Net Retained: Rs. ${finalNetRev.toLocaleString("en-IN")}  |  Coach Payouts: Rs. ${trainerPayoutLiability.toLocaleString("en-IN")}  |  Expenses: Rs. ${Number(totalExpenses).toLocaleString("en-IN")}`, 18, 104);
  } else {
    doc.text(`Memberships & Fees: Rs. ${(finalGross - supplementRevenue).toLocaleString("en-IN")}  |  Store Sales: Rs. ${supplementRevenue.toLocaleString("en-IN")}  |  Active: ${activeMembersCount}`, 18, 104);
  }

  // 6. Section 1: Revenue Transactions Table
  let currentY = 117;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("1. ITEMIZED REVENUE TRANSACTIONS (FEES & SALES)", 14, currentY);

  currentY += 4;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, currentY, 182, 6.5, "FD");

  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text("Date", 17, currentY + 4.5);
  doc.text("Member / Particulars", 42, currentY + 4.5);
  doc.text("Category / Plan", 105, currentY + 4.5);
  doc.text("Mode", 152, currentY + 4.5);
  doc.text("Amount (Rs.)", 173, currentY + 4.5);

  currentY += 7;
  doc.setFont("helvetica", "normal");

  const revRows = revenueItems.slice(0, 8); // Top items for first page
  if (revRows.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.text("No revenue transactions recorded for this selected duration.", 17, currentY + 5);
    currentY += 8;
  } else {
    revRows.forEach((item) => {
      doc.setTextColor(30, 41, 59);
      doc.text(String(item.date || "—").slice(0, 10), 17, currentY + 4);
      doc.text(String(item.memberName || item.particulars || "Gym Member").slice(0, 28), 42, currentY + 4);
      doc.text(String(item.planName || item.category || "Membership Fee").slice(0, 22), 105, currentY + 4);
      doc.text(String(item.paymentMode || "Cash").toUpperCase(), 152, currentY + 4);
      doc.setFont("helvetica", "bold");
      doc.text(Number(item.amount || item.paidAmount || 0).toLocaleString("en-IN"), 192, currentY + 4, { align: "right" });
      doc.setFont("helvetica", "normal");
      currentY += 6;
    });
  }

  // 7. Section 2: Expense Breakdown Table
  currentY += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("2. ITEMIZED EXPENSES & OVERHEAD COSTS", 14, currentY);

  currentY += 4;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, currentY, 182, 6.5, "FD");

  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text("Date", 17, currentY + 4.5);
  doc.text("Expense Title / Voucher", 42, currentY + 4.5);
  doc.text("Expense Category", 115, currentY + 4.5);
  doc.text("Type", 152, currentY + 4.5);
  doc.text("Amount (Rs.)", 173, currentY + 4.5);

  currentY += 7;
  doc.setFont("helvetica", "normal");

  const expRows = expenseItems.slice(0, 7);
  if (expRows.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.text("No expense logs recorded for this selected duration.", 17, currentY + 5);
    currentY += 8;
  } else {
    expRows.forEach((item) => {
      doc.setTextColor(30, 41, 59);
      doc.text(String(item.date || "—").slice(0, 10), 17, currentY + 4);
      doc.text(String(item.title || "Operational Overhead").slice(0, 32), 42, currentY + 4);
      doc.text(String(item.category || "General").slice(0, 18), 115, currentY + 4);
      doc.text(String(item.type || "One-time").toUpperCase(), 152, currentY + 4);
      doc.setFont("helvetica", "bold");
      doc.text(Number(item.amount || 0).toLocaleString("en-IN"), 192, currentY + 4, { align: "right" });
      doc.setFont("helvetica", "normal");
      currentY += 6;
    });
  }

  // 8. Signatory & Official Stamp
  const footerY = 250;
  if (settings.signatureUrl && settings.signatureUrl.startsWith("data:image")) {
    try {
      doc.addImage(settings.signatureUrl, "PNG", 138, footerY - 12, 38, 14);
    } catch (e) {
      console.warn("Signature embed failed:", e);
    }
  }

  doc.setDrawColor(148, 163, 184);
  doc.line(130, footerY + 5, 185, footerY + 5);
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text(settings.ownerSignatureName || "Authorized Signatory", 157, footerY + 11, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(settings.ownerSignatureTitle || "Gym Manager / Owner", 157, footerY + 16, { align: "center" });

  // Verified Stamp simulation
  doc.setDrawColor(16, 185, 129);
  doc.circle(42, footerY + 5, 12);
  doc.setTextColor(16, 185, 129);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("FINANCIALLY AUDITED", 42, footerY + 4, { align: "center" });
  doc.text("VERIFIED", 42, footerY + 9, { align: "center" });

  // Footer Disclaimer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`This is an authentic computer-generated Financial Audit Statement issued by ${settings.gymName || "UNIVO GYM MANAGEMENT"}.`, 105, 282, { align: "center" });

  const safePeriod = periodLabel.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Financial_Statement_${periodType}_${safePeriod}.pdf`);
}

export function generateTrainerEarningsStatementPDF({
  trainerName,
  trainerPhone,
  periodType,
  periodLabel,
  baseSalary,
  ptCommission,
  supplementCommission,
  totalNetEarnings,
  ptClientsCount,
  supplementSalesCount,
  breakdownItems = []
}) {
  const settings = getGymSettings();
  const doc = new jsPDF();

  // Header branding banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 28, "F");

  // Accent line
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 26, 210, 2, "F");

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text((settings.gymName || "UNIVO GYM MANAGEMENT").toUpperCase(), 105, 11, { align: "center" });

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text(settings.tagline || "Stronger Today, Healthier Tomorrow", 105, 17, { align: "center" });
  doc.text(
    `Tel: ${settings.phone || "+91 9196302375"} | Branch: ${settings.address || "Main Branch"}`,
    105,
    22,
    { align: "center" }
  );

  // Document Title
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("TRAINER OFFICIAL EARNINGS & PAYOUT STATEMENT", 105, 38, { align: "center" });

  // Meta Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 43, 180, 22, 3, 3, "FD");

  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "bold");
  doc.text(`Trainer: ${trainerName || "Coach"}`, 22, 51);
  doc.text(`Statement Period: ${periodLabel || periodType}`, 120, 51);

  doc.setFont("helvetica", "normal");
  doc.text(`Phone / WhatsApp: ${trainerPhone || "—"}`, 22, 59);
  doc.text(`Generated On: ${new Date().toLocaleDateString("en-IN")} ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`, 120, 59);

  // KPI Summary Strip (4 Cards)
  const kpis = [
    { title: "FIXED SALARY", val: `Rs. ${Number(baseSalary || 0).toLocaleString("en-IN")}`, fill: [241, 245, 249], border: [203, 213, 225] },
    { title: "PT COMMISSIONS", val: `Rs. ${Number(ptCommission || 0).toLocaleString("en-IN")}`, fill: [243, 232, 255], border: [216, 180, 254] },
    { title: "STORE REFERRAL CUT", val: `Rs. ${Number(supplementCommission || 0).toLocaleString("en-IN")}`, fill: [254, 243, 199], border: [252, 211, 77] },
    { title: "NET EARNINGS", val: `Rs. ${Number(totalNetEarnings || 0).toLocaleString("en-IN")}`, fill: [236, 253, 245], border: [110, 231, 183] },
  ];

  kpis.forEach((k, idx) => {
    const x = 15 + idx * 46;
    doc.setFillColor(k.fill[0], k.fill[1], k.fill[2]);
    doc.setDrawColor(k.border[0], k.border[1], k.border[2]);
    doc.roundedRect(x, 70, 42, 22, 2.5, 2.5, "FD");

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(k.title, x + 21, 77, { align: "center" });

    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(k.val, x + 21, 86, { align: "center" });
  });

  // Section Header: Itemized Ledger
  let curY = 101;
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("ITEMIZED EARNINGS & INCENTIVE LEDGER", 15, curY);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Active PT Clients: ${ptClientsCount || 0}  |  Supplement Referrals: ${supplementSalesCount || 0}`, 130, curY);

  curY += 4;
  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(15, curY, 180, 7, 1.5, 1.5, "FD");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("DATE", 19, curY + 5);
  doc.text("SOURCE / CLIENT", 45, curY + 5);
  doc.text("PLAN / PRODUCT", 100, curY + 5);
  doc.text("TOTAL SALE", 150, curY + 5, { align: "right" });
  doc.text("TRAINER CUT (+Rs.)", 192, curY + 5, { align: "right" });

  curY += 8;

  const displayRows = breakdownItems.slice(0, 18);
  if (displayRows.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.text("No specific variable commissions recorded in this duration.", 19, curY + 6);
    curY += 12;
  } else {
    displayRows.forEach((row, i) => {
      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, curY - 1, 180, 6, "F");
      }
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      doc.text(String(row.date || "—").slice(0, 10), 19, curY + 3.5);
      doc.text(String(row.title || row.clientName || "—").slice(0, 28), 45, curY + 3.5);
      doc.text(String(row.typeLabel || row.planName || "Incentive").slice(0, 26), 100, curY + 3.5);
      doc.text(Number(row.totalSale || 0).toLocaleString("en-IN"), 150, curY + 3.5, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setTextColor(16, 185, 129);
      doc.text(`+Rs. ${Number(row.trainerCut || 0).toLocaleString("en-IN")}`, 192, curY + 3.5, { align: "right" });
      doc.setFont("helvetica", "normal");
      curY += 6;
    });
  }

  // Footer & Official Verification
  const footerY = 252;
  doc.setDrawColor(203, 213, 225);
  doc.line(15, footerY, 195, footerY);

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Gym Manager / Authorized Signatory", 155, footerY + 14, { align: "center" });

  doc.setDrawColor(16, 185, 129);
  doc.circle(42, footerY + 12, 10);
  doc.setTextColor(16, 185, 129);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("PAYROLL VERIFIED", 42, footerY + 11, { align: "center" });
  doc.text("APPROVED", 42, footerY + 15, { align: "center" });

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Official Trainer Payroll Record issued by ${settings.gymName || "UNIVO GYM"}.`, 105, 284, { align: "center" });

  const safePeriod = (periodLabel || periodType).replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Trainer_Earnings_${trainerName.replace(/\s+/g, "_")}_${safePeriod}.pdf`);
}

