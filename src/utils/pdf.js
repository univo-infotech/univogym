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

  // Signature Block
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