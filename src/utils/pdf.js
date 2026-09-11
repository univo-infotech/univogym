import jsPDF from "jspdf";
import { getGymSettings } from "./settings";

export function generatePaymentReceipt(payment, customSettings = null) {
  const settings = customSettings || getGymSettings();
  const doc = new jsPDF();

  // Header branding banner
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, 210, 24, "F");

  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(settings.gymName || "UNIVO GYM MANAGEMENT", 105, 12, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(settings.tagline || "Stronger Today, Healthier Tomorrow", 105, 18, { align: "center" });

  // Receipt Title
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("OFFICIAL MEMBERSHIP RECEIPT", 105, 36, { align: "center" });

  // Receipt Meta box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 44, 180, 22, 3, 3, "FD");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text(`Receipt No: INV-${payment.id || Date.now().toString().slice(-6)}`, 22, 53);
  doc.text(`Date: ${payment.date || new Date().toLocaleDateString("en-IN")}`, 130, 53);
  doc.setFont("helvetica", "normal");
  doc.text(`Gym Contact: ${settings.phone || "+91 9196302375"}`, 22, 60);
  doc.text(`Status: ${(Number(payment.dueAmount) > 0 ? "PARTIAL PAYMENT" : "FULL PAYMENT")}`, 130, 60);

  // Member & Billing Details Table
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 75, 180, 8, "FD");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Particulars / Description", 20, 80.5);
  doc.text("Payment Mode", 110, 80.5);
  doc.text("Amount (INR)", 165, 80.5);

  // Item Row
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(payment.planName || "Gym Membership Subscription", 20, 93);
  doc.text((payment.paymentMode || "CASH").toUpperCase(), 110, 93);
  doc.setFont("helvetica", "bold");
  doc.text(`Rs. ${payment.paidAmount || payment.amount || 0}`, 165, 93);

  // Line separator
  doc.setDrawColor(226, 232, 240);
  doc.line(15, 102, 195, 102);

  // Summary box
  doc.setFont("helvetica", "normal");
  doc.text("Total Plan Price:", 120, 112);
  doc.text(`Rs. ${payment.amount || payment.paidAmount || 0}`, 165, 112);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129);
  doc.text("Amount Received:", 120, 120);
  doc.text(`Rs. ${payment.paidAmount || payment.amount || 0}`, 165, 120);

  doc.setTextColor(225, 29, 72);
  doc.text("Remaining Balance Due:", 120, 128);
  doc.text(`Rs. ${payment.dueAmount || 0}`, 165, 128);

  // Member Information Details
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 140, 180, 24, 3, 3);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.text(`Member Name: ${payment.memberName || "Athlete"}`, 22, 148);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Notes / Terms: Non-transferable & non-refundable membership pass.`, 22, 156);

  // Signature section
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(settings.ownerSignatureName || "Authorized Signatory", 150, 190, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(settings.ownerSignatureTitle || "Gym Manager / Owner", 150, 195, { align: "center" });
  doc.setDrawColor(148, 163, 184);
  doc.line(125, 183, 175, 183);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("This is a computer generated invoice provided by " + (settings.gymName || "UNIVO GYM MANAGEMENT"), 105, 280, { align: "center" });

  doc.save(`Receipt_${(payment.memberName || "Member").replace(/\s+/g, "_")}.pdf`);
}