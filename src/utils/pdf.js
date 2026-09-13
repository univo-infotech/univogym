import jsPDF from "jspdf";
import { getGymSettings } from "./settings";

export function generatePaymentReceipt(payment, customSettings = null) {
  const settings = customSettings || getGymSettings();
  const doc = new jsPDF();

  // Header branding banner
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, 210, 26, "F");

  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text((settings.gymName || "UNIVO GYM MANAGEMENT").toUpperCase(), 105, 12, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(settings.tagline || "Stronger Today, Healthier Tomorrow", 105, 18, { align: "center" });
  doc.text(
    `Tel: ${settings.phone || "+91 9196302375"} | Branch: ${settings.address || "Main Branch"}`,
    105,
    23,
    { align: "center" }
  );

  // Receipt Title
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("OFFICIAL MEMBERSHIP RECEIPT & TAX INVOICE", 105, 38, { align: "center" });

  // Receipt Meta box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 45, 180, 24, 3, 3, "FD");

  const receiptNo = payment.receiptNo || payment.id || `INV-${Date.now().toString().slice(-6)}`;
  const payDate = payment.date || new Date().toLocaleDateString("en-IN");
  const isPartial = Number(payment.dueAmount) > 0;

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text(`Receipt No: ${receiptNo}`, 22, 53);
  doc.text(`Invoice Date: ${payDate}`, 125, 53);

  doc.setFont("helvetica", "normal");
  doc.text(`Payment Mode: ${(payment.paymentMode || "CASH").toUpperCase()}`, 22, 60);
  doc.text(`Payment Status: ${isPartial ? "PARTIAL PAYMENT (DUES PENDING)" : "FULL PAYMENT (CLEARED)"}`, 125, 60);

  if (payment.remarks || payment.reference) {
    doc.text(`Ref / Remarks: ${payment.remarks || payment.reference}`, 22, 66);
  }

  // Member Information Card
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 73, 180, 22, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("MEMBER DETAILS:", 22, 81);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(`Name: ${payment.memberName || "Athlete"}`, 22, 88);
  doc.text(`Phone: ${payment.phone || "—"}`, 85, 88);
  doc.text(`Slot/Batch: ${payment.slot || payment.batch || "General Floor"}`, 140, 88);

  // Billing Particulars Table Header
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 100, 180, 8, "FD");

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Plan Description", 20, 105.5);
  doc.text("Validity Period", 90, 105.5);
  doc.text("Discount", 142, 105.5);
  doc.text("Amount (INR)", 168, 105.5);

  // Table Row
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(payment.planName || "Gym Membership Subscription", 20, 117);

  const validityText = (payment.validityStart && payment.validityEnd)
    ? `${payment.validityStart} to ${payment.validityEnd}`
    : payment.validity || "1 Month Access";
  doc.text(validityText, 90, 117);

  const discountText = Number(payment.discount) > 0 ? `Rs. ${payment.discount}` : "Rs. 0";
  doc.text(discountText, 142, 117);

  const paidAmount = Number(payment.paidAmount || payment.amount || 0);
  const totalPlanPrice = Number(payment.amount || payment.paidAmount || 0);
  const remainingDue = Number(payment.dueAmount || 0);

  doc.setFont("helvetica", "bold");
  doc.text(`Rs. ${paidAmount.toLocaleString()}`, 168, 117);

  // Line separator
  doc.setDrawColor(226, 232, 240);
  doc.line(15, 126, 195, 126);

  // Summary box
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Plan Base Fee:", 125, 135);
  doc.text(`Rs. ${totalPlanPrice.toLocaleString()}`, 172, 135);

  if (Number(payment.discount) > 0) {
    doc.text("Special Discount:", 125, 142);
    doc.text(`- Rs. ${Number(payment.discount).toLocaleString()}`, 172, 142);
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129);
  doc.text("Amount Received:", 125, 150);
  doc.text(`Rs. ${paidAmount.toLocaleString()}`, 172, 150);

  if (remainingDue > 0) {
    doc.setTextColor(225, 29, 72);
    doc.text("Pending Balance Due:", 125, 158);
    doc.text(`Rs. ${remainingDue.toLocaleString()}`, 172, 158);
  }

  // Terms & Conditions Box
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 170, 180, 22, 2, 2);
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("TERMS & CONDITIONS:", 20, 176);
  doc.setFont("helvetica", "normal");
  doc.text("1. Fees once paid is strictly non-refundable and non-transferable under any circumstances.", 20, 182);
  doc.text("2. Please present this receipt or member ID pass upon entering the fitness facility.", 20, 187);

  // Logo embedding if custom dataUrl is provided
  if (settings.logoUrl && settings.logoUrl.startsWith("data:image")) {
    try {
      doc.addImage(settings.logoUrl, "PNG", 14, 4, 18, 18);
    } catch (e) {
      console.warn("Logo image embed failed:", e);
    }
  }

  // Signature Block
  if (settings.signatureUrl && settings.signatureUrl.startsWith("data:image")) {
    try {
      doc.addImage(settings.signatureUrl, "PNG", 135, 196, 40, 16);
    } catch (e) {
      console.warn("Signature image embed failed:", e);
    }
  }

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(settings.ownerSignatureName || "Authorized Signatory", 155, 220, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(settings.ownerSignatureTitle || "Gym Manager / Owner", 155, 226, { align: "center" });
  doc.setDrawColor(148, 163, 184);
  doc.line(130, 213, 180, 213);

  // Stamp circle simulation
  doc.setDrawColor(16, 185, 129);
  doc.circle(45, 216, 14);
  doc.setTextColor(16, 185, 129);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("VERIFIED & PAID", 45, 215, { align: "center" });
  doc.text((settings.gymName || "UNIVO GYM").slice(0, 15).toUpperCase(), 45, 220, { align: "center" });

  // Footer
  doc.setFontSize(8);
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
      doc.addImage(settings.logoUrl, "PNG", 14, 5, 22, 22);
    } catch (e) {
      console.warn("Logo embed failed:", e);
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
