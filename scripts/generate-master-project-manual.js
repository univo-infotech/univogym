import { jsPDF } from "jspdf";
import fs from "fs";

const doc = new jsPDF({
  orientation: "portrait",
  unit: "mm",
  format: "a4"
});

const pageWidth = 210;
const pageHeight = 297;
const margin = 14;
const contentWidth = pageWidth - (margin * 2);

// Color palette
const C_NAVY = [15, 23, 42];      // #0f172a
const C_TEAL = [13, 148, 136];    // #0d9488
const C_EMERALD = [16, 185, 129]; // #10b981
const C_TEXT = [30, 41, 59];      // #1e293b
const C_MUTED = [100, 116, 139];  // #64748b
const C_BG_LIGHT = [248, 250, 252];// #f8fafc
const C_BORDER = [226, 232, 240]; // #e2e8f0

let y = margin;
let pageNumber = 1;

function drawPageDecorations() {
  // Top thin accent bar
  doc.setFillColor(...C_TEAL);
  doc.rect(0, 0, pageWidth, 3, "F");

  // Bottom footer bar
  doc.setFillColor(...C_BG_LIGHT);
  doc.rect(0, pageHeight - 12, pageWidth, 12, "F");
  doc.setDrawColor(...C_BORDER);
  doc.line(0, pageHeight - 12, pageWidth, pageHeight - 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C_MUTED);
  doc.text("UNIVO GYM MANAGEMENT SYSTEM — COMPLETE MASTER PRODUCT MANUAL & SOP", margin, pageHeight - 5);
  doc.text(`Page ${pageNumber}`, pageWidth - margin - 12, pageHeight - 5);
}

function checkPage(neededSpace = 20) {
  if (y + neededSpace > pageHeight - 18) {
    doc.addPage();
    pageNumber++;
    drawPageDecorations();
    y = margin + 6;
  }
}

function addHeader(title, subtitle) {
  drawPageDecorations();
  doc.setFillColor(...C_NAVY);
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(title, margin + 8, y + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(subtitle, margin + 8, y + 19);

  y += 34;
}

function addChapterHeading(number, title) {
  checkPage(18);
  doc.setFillColor(...C_NAVY);
  doc.roundedRect(margin, y - 4, contentWidth, 10, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(`CHAPTER ${number}: ${title.toUpperCase()}`, margin + 5, y + 3);

  y += 12;
}

function addSectionTitle(title) {
  checkPage(14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...C_TEAL);
  doc.text(title, margin, y);
  doc.setDrawColor(...C_TEAL);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 1.5, margin + contentWidth, y + 1.5);
  y += 7;
}

function addParagraph(text, isBold = false) {
  checkPage(10);
  doc.setFont("helvetica", isBold ? "bold" : "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C_TEXT);
  const lines = doc.splitTextToSize(text, contentWidth);
  doc.text(lines, margin, y);
  y += lines.length * 4.3 + 2;
}

function addBullet(term, description) {
  checkPage(10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  doc.setTextColor(...C_NAVY);
  const prefix = `•  ${term}: `;
  const prefixWidth = doc.getTextWidth(prefix);
  doc.text(prefix, margin + 2, y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_TEXT);
  const descLines = doc.splitTextToSize(description, contentWidth - prefixWidth - 4);
  doc.text(descLines, margin + 2 + prefixWidth, y);
  y += descLines.length * 4.2 + 2;
}

function addStepBox(stepNum, stepTitle, stepBody) {
  checkPage(20);
  doc.setFillColor(...C_BG_LIGHT);
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);

  const lines = doc.splitTextToSize(stepBody, contentWidth - 14);
  const boxHeight = 12 + (lines.length * 4);

  doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, "FD");

  doc.setFillColor(...C_TEAL);
  doc.circle(margin + 6, y + 6, 3.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(String(stepNum), margin + 5, y + 8.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...C_NAVY);
  doc.text(stepTitle, margin + 13, y + 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...C_TEXT);
  doc.text(lines, margin + 6, y + 13);

  y += boxHeight + 4;
}

function addTable(headers, rows, colWidths) {
  checkPage(15 + (rows.length * 7));
  const startX = margin;
  let curY = y;

  // Header row
  doc.setFillColor(...C_NAVY);
  doc.rect(startX, curY, contentWidth, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  let curX = startX;
  headers.forEach((h, i) => {
    doc.text(h, curX + 2, curY + 4.8);
    curX += colWidths[i];
  });
  curY += 7;

  // Body rows
  rows.forEach((row, rIdx) => {
    checkPage(8);
    doc.setFillColor(rIdx % 2 === 0 ? 255 : 248, rIdx % 2 === 0 ? 255 : 250, rIdx % 2 === 0 ? 255 : 252);
    doc.rect(startX, curY, contentWidth, 6.5, "F");
    doc.setDrawColor(...C_BORDER);
    doc.setLineWidth(0.1);
    doc.line(startX, curY + 6.5, startX + contentWidth, curY + 6.5);

    curX = startX;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(...C_TEXT);

    row.forEach((cell, cIdx) => {
      const cellText = doc.splitTextToSize(String(cell), colWidths[cIdx] - 3)[0] || "";
      doc.text(cellText, curX + 2, curY + 4.5);
      curX += colWidths[cIdx];
    });
    curY += 6.5;
  });

  y = curY + 4;
}

// ==========================================
// DOCUMENT GENERATION
// ==========================================

addHeader(
  "UNIVO GYM MANAGEMENT — MASTER PRODUCT MANUAL",
  "Complete Operating SOP: End-to-End Workflows, Button Actions & Architecture Guide"
);

// CHAPTER 1
addChapterHeading(1, "The Univo Vision & Role-Based Architecture");
addParagraph("Univo Gym Management is a complete multi-gym operating system tailored for commercial fitness clubs, crossfit studios, and personal training academies. It enforces strict real-time billing, automatic fee expiry access control, trainer shift balancing, and zero-effort WhatsApp client communication.");

addSectionTitle("System Role Hierarchy");
addBullet("Owner (Super Admin)", "Has unrestricted access to revenue, profit & loss, staff salaries, pricing plans, member deletions, biometric locks, and gym settings.");
addBullet("Trainer (Coach Portal)", "Access restricted strictly to assigned clients, workout tracking, customized diet plans, client progress photos, and shift schedules.");
addBullet("Front Desk / Staff", "Can register walk-ins, mark daily staff attendance, record payments, and manage inventory without seeing owner-only profit reports.");
addBullet("Member (Client Portal)", "Mobile-first client portal to view active membership, workout schedule, assigned trainer, diet chart, payment history, and biometric streak.");

// CHAPTER 2
addChapterHeading(2, "Initial Setup & First Day Configuration");
addParagraph("When onboarding a new gym to Univo Gym Management, complete the following 4 foundational steps before admitting members:");

addStepBox(1, "Configure Gym Profile & Branding (Settings)", "Open Settings > Business Profile. Enter Gym Legal Name, Phone, Email, Physical Address, and upload Gym Logo. Upload UPI QR Code for instant receipt QR scanning and specify Terms & Conditions printed on liability waivers.");
addStepBox(2, "Create Membership Plans (Memberships)", "Go to Memberships. Define standard membership packages (e.g., 1-Month Basic Rs.2,500, 3-Month Pro Rs.6,500, 1-Year Elite Rs.18,000). Set duration in days, pricing, features list, and tax applicability.");
addStepBox(3, "Add Trainers & Personal Training Packages (Trainers)", "Add Trainers with Specialization, Shift Timings (Morning, Evening, Both), Phone, and individual PT Packages (e.g., 1-Month 1-on-1 PT Rs.4,500). System uses this to calculate trainer commissions.");
addStepBox(4, "Configure Add-on Services (Services)", "Set up auxiliary revenue streams like Steam & Sauna, Personal Locker, Body Composition Scan, or Diet Consultation with Per Month or One-Time billing.");

// CHAPTER 3
addChapterHeading(3, "Member Onboarding & Admission Engine");
addParagraph("Univo Gym provides two distinct, frictionless methods for admitting new members into the gym:");

addSectionTitle("Method A: Direct In-Person Admission (+ Add Member)");
addParagraph("Use this when the member is standing at the reception desk ready to pay:");
addBullet("Open Form", "Click '+ Add Member' button in the top right of Member Directory.");
addBullet("Fill Personal Details", "Enter Full Name, Phone Number, Email, Gender, DOB, and Workout Slot (Morning, Afternoon, Evening, Night).");
addBullet("Select Membership Plan", "Choose from predefined gym plans. Duration and pricing populate automatically.");
addBullet("Optional Personal Trainer", "Select whether member wants a coach. If yes, pick coach and package. System checks trainer shift capacity.");
addBullet("Collect Payment", "Enter Paid Amount. If full amount paid, status becomes 'Paid'. If partial, balance moves to 'Due' with automated reminders.");
addBullet("Save & Auto-Receipt", "Click 'Save Member'. Official PDF receipt generates instantly with 1-click WhatsApp send.");

addSectionTitle("Method B: 10-Minute Self-Registration WhatsApp Link");
addParagraph("Eliminates front-desk queues during rush hours by letting members fill their own details on their mobile phone:");
addBullet("Generate Token", "Click 'Share 10-Min Link' button on top of Member Directory.");
addBullet("Send to Member", "Click 'Send via WhatsApp' or copy secure temporary token URL.");
addBullet("Member Completes Form", "Member uploads photo, enters contact info, signs digital liability waiver, and submits on their phone.");
addBullet("Instant Verification", "Link expires automatically after 10 minutes for airtight security. Member appears in Member Directory immediately.");

// CHAPTER 4
addChapterHeading(4, "Member Directory & Lifecycle (Button-by-Button Guide)");
addParagraph("The Member Directory is the command center of the gym. It features 7 automated real-time KPI filter tabs and 13 action triggers:");

addSectionTitle("The 7 Automated Metric Filter Tabs");
addTable(
  ["Filter Tab Name", "Color / Badge", "Condition & Automated Behavior"],
  [
    ["Fully Paid", "Green Badge", "Plan active, expiry > today, and due balance is zero."],
    ["Ending Soon", "Amber Badge", "Membership plan expiring within the next 3 days."],
    ["Expired", "Red Badge", "Expiry date passed today, gym gate automatically locked."],
    ["Due", "Red Alert", "Payment balance remaining (Due > 0) after partial collection."],
    ["Partial Fee", "Amber Badge", "Members who made token payments with outstanding balances."],
    ["Gym Left", "Slate Badge", "Members who quit or discontinued. Coach slot freed up."],
    ["PT Ended", "Purple Badge", "Gym membership active, but Personal Training package finished."]
  ],
  [45, 35, 102]
);

addSectionTitle("Master Guide: What Every Button Does");
addBullet("View (Eye Icon)", "Opens Member Profile 360: Attendance calendar, payment history, medical notes, PT logs, and before/after photos.");
addBullet("Extend (Calendar Plus)", "Adds complimentary days (+10 days or custom) to an active member's expiry without creating a bill (useful for holidays/injuries).");
addBullet("Gym Renew (Rotate Ccw)", "Initiates a fresh membership cycle when plan is ending soon or expired. Prompts plan selection, collects fee, and issues bill.");
addBullet("PT Renew (Sparkles Icon)", "Renews Personal Training package when coach duration has ended. Re-engages trainer shift and updates commission.");
addBullet("Collect / Remaining (Rupee)", "Opens fast payment collector for members with outstanding due balances. Updates due to zero and prints balance receipt.");
addBullet("Receipt (Receipt Icon)", "Opens official payment invoice modal. Generates professional PDF with gym logo and sends formatted receipt to member's WhatsApp.");
addBullet("Edit (Pencil Icon)", "Allows updating phone number, workout slot, emergency contact, email, address, and profile photo.");
addBullet("Left (LogOut Icon)", "Marks member as 'Left Gym'. Prompts leaving reason. Frees trainer shift schedule and revokes member portal login.");
addBullet("Rejoin Gym (Rotate Ccw)", "Exclusively for Left members. Opens Membership & Fee Modal with validity starting TODAY. Collects new fees and generates new bill.");
addBullet("Delete (Trash Icon)", "Permanently deletes member record from database and local cache after mandatory confirmation.");
addBullet("+ Add PT (Plus Badge)", "Enables mid-month personal training add-on for existing floor members without resetting their gym plan validity.");
addBullet("End PT (Stop Icon)", "Ends personal training package while keeping general gym access intact. Frees coach schedule immediately.");
addBullet("Lock/Unlock Gate (Padlock)", "Instantly blocks or restores biometric turnstile access for disciplinary or administrative reasons.");

// CHAPTER 5
addChapterHeading(5, "Personal Training (PT) Lifecycle & Coach Roster");
addParagraph("Univo Gym enforces strict professional business logic regarding Personal Training:");

addSectionTitle("Core Business Rules for Personal Training");
addBullet("Gym is Foundation", "A client cannot purchase Personal Training alone without active gym membership. Gym access is the base prerequisite.");
addBullet("Independent Expiry Cycles", "Gym Plan (e.g., 3-Month Gold) and PT Package (e.g., 1-Month 1-on-1 PT) maintain independent start and expiry dates.");
addBullet("Automated Coach Shift Release", "When a member ends PT or leaves the gym, the coach's slot (e.g., 7:00 AM - 8:00 AM) is freed instantly for new client assignment.");
addBullet("Separate Financial Ledgers", "Gym fees and PT fees generate distinct receipts and revenue lines for transparent trainer commission reporting.");

// CHAPTER 6
addChapterHeading(6, "Universal Biometric Attendance & Access Control");
addParagraph("Supports Secureye, Realtime, ZKTeco, and e-SSL machines with real-time fee expiry locking and gate synchronization:");

addSectionTitle("The 4-Point Real-Time Gate Security Engine");
addParagraph("The moment a member touches the scanner, Univo Gym verifies 4 security points in under 0.1 seconds:");
addBullet("Point 1: Expiry Verification", "If expiryDate < today, status becomes 'DENIED: Membership Expired on DD/MM/YYYY'. Turnstile remains locked.");
addBullet("Point 2: Pending Due Check", "If member has an overdue balance (status == 'due'), gate denies entry: 'DENIED: Pending Balance Rs.X'.");
addBullet("Point 3: Account Status Check", "If member is marked as Left or Terminated, gate denies entry: 'DENIED: Account Terminated'.");
addBullet("Point 4: Manual Lock Check", "If owner toggled 'Lock Gate' in software, gate denies entry: 'DENIED: Access Suspended by Owner'.");
addBullet("Access Granted (Green)", "If all 4 checks pass: Screen flashes green 'ACCESS GRANTED', buzzer chimes, daily attendance logs, and workout streak increments +1.");

addSectionTitle("Connecting Hardware to Software");
addBullet("Cloud Webhook Mode", "For Realtime/eSSL/ZKTeco. Enter Webhook URL 'https://api.univogym.com/api/biometric/push' in machine menu. No PC required!");
addBullet("Local LAN / Bridge Mode", "For Secureye S-B8CB. Machine connects to gym Wi-Fi router (Port 5005/7005). Local gateway syncs punches into cloud.");
addBullet("USB Flash Drive Mode", "For gyms without internet. Plug pen drive into machine, select 'U-Flash > Download GLog', and upload file in software.");

// CHAPTER 7
addChapterHeading(7, "Billing, Multi-Mode Payments & WhatsApp Automation");
addParagraph("Every rupee collected in Univo Gym generates compliant accounting entries and instant customer receipts:");

addSectionTitle("Flexible Payment Collection");
addBullet("Supported Payment Modes", "Full Cash, Online UPI (GPay/PhonePe/Paytm), Direct Bank NEFT/RTGS, and Split Payments (e.g., Rs.2,000 Cash + Rs.1,000 UPI).");
addBullet("GST & Non-GST Support", "Toggle GST tax calculation with custom tax percentage and HSN/SAC fitness codes.");
addBullet("Automated Receipts", "Generates professional PDF with receipt number, gym logo, QR payment verification, and terms.");
addBullet("1-Click WhatsApp Sharing", "Pre-formatted message sent directly to member's WhatsApp phone with plan validity, trainer name, and receipt link.");

// CHAPTER 8
addChapterHeading(8, "Front Desk, Walk-Ins & Lead Management (Visits)");
addParagraph("Convert walk-in prospects into paying members with automated follow-up tracking:");
addBullet("Log Walk-In", "Record prospect name, phone, interested plan, source (Google, Instagram, Referral), and trial demo date.");
addBullet("Follow-Up Pipeline", "Categorized into New Lead, Trial Demo Done, Follow-Up Scheduled, Converted, and Lost.");
addBullet("1-Click Member Conversion", "Click 'Convert to Member' on any lead. All contact information transfers into admission form automatically.");

// CHAPTER 9
addChapterHeading(9, "Equipment Inventory, Stock & Expense Tracking");
addParagraph("Protect gym assets and monitor maintenance schedules to prevent equipment downtime:");
addBullet("Stock Catalog", "Track Machines, Barbells, Dumbbells, Weight Plates, Cable Attachments, and Consumables (Chalk, Sanitizers).");
addBullet("Service Interval Alarms", "Set maintenance intervals (e.g., Cable lubrication every 30 days). System flags items when service is overdue.");
addBullet("Expense Tracker", "Record daily expenses (Cleaning, Repairs) and monthly recurring overheads (Rent, Electricity, Trainer Salaries).");

// CHAPTER 10
addChapterHeading(10, "Business Analytics, P&L Reports & Staff Roles");
addParagraph("Gain complete visibility into the health and profitability of the fitness business:");
addBullet("Daily & Monthly P&L", "Calculates Net Profit = Total Revenue (Gym + PT + Services) minus Total Expenses (Overhead + Salaries).");
addBullet("Member Growth Trends", "Visual bar and line charts showing new admissions vs dropped members over the last 12 months.");
addBullet("Granular Staff Permissions", "Configure role permissions: enable/disable access to Payments, Reports, Member Deletion, or Plan Editing per employee.");

const pdfBuffer = doc.output("arraybuffer");
fs.writeFileSync("UNIVO_GYM_MASTER_PROJECT_MANUAL.pdf", Buffer.from(pdfBuffer));
console.log("Master Project Manual PDF created successfully: UNIVO_GYM_MASTER_PROJECT_MANUAL.pdf");
