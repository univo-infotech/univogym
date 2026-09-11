import jsPDF from "jspdf";

export function generatePaymentReceipt(payment, gymName = "UNIVO GYM MANAGEMENT") {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.setTextColor(26, 32, 53);
  doc.text(gymName, 105, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Stronger Today, Healthier Tomorrow", 105, 26, { align: "center" });
  doc.text("---------------------------------------------------------------------------------", 105, 30, { align: "center" });

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("MEMBERSHIP PAYMENT RECEIPT", 105, 40, { align: "center" });

  doc.setFontSize(11);
  doc.text(`Receipt Date: ${payment.date || new Date().toLocaleDateString()}`, 20, 55);
  doc.text(`Member Name: ${payment.memberName || "Member"}`, 20, 65);
  doc.text(`Plan: ${payment.planName || "Gym Membership"}`, 20, 75);
  doc.text(`Payment Mode: ${(payment.paymentMode || "Cash").toUpperCase()}`, 20, 85);
  doc.text(`Paid Amount: INR ${payment.paidAmount || payment.amount || 0}`, 20, 95);
  doc.text(`Balance Due: INR ${payment.dueAmount || 0}`, 20, 105);

  doc.text("Thank you for training with us!", 105, 140, { align: "center" });
  doc.save(`Receipt_${payment.memberName || "Member"}.pdf`);
}
