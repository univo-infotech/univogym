import { jsPDF } from "jspdf";
import fs from "fs";

const doc = new jsPDF({
  orientation: "portrait",
  unit: "mm",
  format: "a4"
});

// Primary colors
const primary = [15, 23, 42]; // Slate 900
const teal = [13, 148, 136]; // Teal 600
const darkText = [30, 41, 59]; // Slate 800
const lightGray = [100, 116, 139]; // Slate 500

let y = 18;

function addHeader(title, subtitle) {
  doc.setFillColor(...primary);
  doc.rect(0, 0, 210, 24, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("UNIVO GYM MANAGEMENT", 14, 11);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("Biometric Hardware, Member Onboarding & Fee-Locking Master Manual", 14, 18);

  y = 32;
}

function checkPage(needSpace = 15) {
  if (y + needSpace > 280) {
    doc.addPage();
    y = 20;
  }
}

function addSectionTitle(text) {
  checkPage(15);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(12, y - 4, 186, 9, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...teal);
  doc.text(text, 16, y + 2);
  y += 12;
}

function addParagraph(text, isBold = false) {
  checkPage(8);
  doc.setFont("helvetica", isBold ? "bold" : "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...darkText);
  const lines = doc.splitTextToSize(text, 180);
  doc.text(lines, 16, y);
  y += lines.length * 5 + 2;
}

function addBullet(bulletTitle, bulletDesc) {
  checkPage(10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`* ${bulletTitle}:`, 18, y);
  const titleWidth = doc.getTextWidth(`* ${bulletTitle}: `);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkText);
  const descLines = doc.splitTextToSize(bulletDesc, 180 - titleWidth);
  doc.text(descLines, 18 + titleWidth, y);
  y += descLines.length * 5 + 2;
}

// Build PDF
addHeader();

addSectionTitle("1. OVERVIEW & SYSTEM ARCHITECTURE");
addParagraph("Univo Gym Management includes a universal biometric access and attendance engine supporting Secureye, Realtime, ZKTeco, and e-SSL devices. The system enforces real-time fee expiry checks: if a member's plan has expired or fees are due, door access is automatically blocked with instant audio-visual alerts.");

addSectionTitle("2. STEP 1: CONNECT MACHINE TO NETWORK (ONE-TIME SETUP)");
addBullet("Power & Network", "Connect machine to 5V power adapter and plug in LAN cable or connect via Wi-Fi.");
addBullet("DHCP Setup", "Open Menu -> SetComm -> Ethernet/Wi-Fi -> Set DHCP to 'Yes'. Router automatically assigns an IP (e.g., 192.168.1.9).");
addBullet("Server Set", "Open SetComm -> Server Set -> Set DNS to 'No' (Local) or 'Yes' (Cloud). Set Server IP to computer/cloud server and Port to 7005.");

addSectionTitle("3. STEP 2: ADD NEW MEMBER IN UNIVO GYM SOFTWARE");
addBullet("Navigate", "Open Univo Gym -> Members -> Click '+ Add Member'.");
addBullet("Fill Details", "Enter member's Name (e.g., Aman Verma), Phone Number, Workout Slot, and Plan (e.g., 3 Months Gold Plan - Rs. 3,000).");
addBullet("Fee Status", "Select Paid or Due. Click 'Save Member'. Status becomes Active!");

addSectionTitle("4. STEP 3: REGISTER FINGERPRINT ON THE MACHINE");
addBullet("Open Menu", "Press 'M/OK' on the machine -> Go to 'Register' -> Select '1. New Reg.'");
addBullet("Assign User ID", "Enter a machine User ID (e.g., 101) and select Fingerprint.");
addBullet("Sensor Scan", "Ask the member to place their finger on the sensor 3 times until the machine confirms 'Enrolled Successfully / Thank You'.");

addSectionTitle("5. STEP 4: LINK MEMBER WITH BIOMETRIC ID IN SOFTWARE");
addBullet("Open Attendance", "Go to Univo Gym -> Biometric & Attendance -> 'Member Biometric IDs & Lock' tab.");
addBullet("Map Machine ID", "Click 'Enroll Thumb' next to Aman Verma and enter the machine ID (101). Click Save.");
addBullet("Result", "Member badge displays '#101'. Software and hardware are now synchronized!");

addSectionTitle("6. STEP 5: DAILY ATTENDANCE & AUTOMATIC SECURITY CHECK");
addBullet("Member Punch", "Member places registered finger on the sensor at the gym gate.");
addBullet("4-Point Check", "Software verifies: 1) Plan expiry date, 2) Due balance, 3) Account active status, 4) Manual gate lock.");
addBullet("Access Granted (Green)", "If fees are paid and plan is active: Access Granted message appears, gate opens, and daily attendance streak +1 increments.");
addBullet("Access Denied (Red)", "If plan is expired or fees are pending: Access Denied alert appears, gate remains locked, and buzzer sounds.");

addSectionTitle("7. FREQUENTLY ASKED QUESTIONS & SPECIAL CASES");
addBullet("Plan Expired", "No manual deletion required from the machine. The software automatically locks the gate on expiry.");
addBullet("Plan Renewal", "As soon as the owner collects fees or extends the plan, gate access unlocks automatically within seconds.");
addBullet("Disciplinary Lock", "Click 'Lock Gate' in Member Biometric IDs tab to immediately suspend gate access for any member.");
addBullet("Internet Downtime", "Machine buffers up to 100,000 punches locally. Offline USB sync is also supported via 'U-Flash -> Download GLog'.");

addSectionTitle("8. RECOMMENDED BIOMETRIC HARDWARE FOR CLIENTS");
addBullet("Realtime T502 / RS20", "Best for SaaS: Direct Cloud HTTP Webhook support, no local PC required (~Rs. 3,500 - 5,000).");
addBullet("e-SSL K30 Pro / ZKTeco", "Best for Commercial Gyms: Heavy duty, magnetic glass door/turnstile relay support (~Rs. 4,500 - 7,500).");
addBullet("Face Recognition (T52F)", "Best for Modern Gyms: Touchless 0.3s face scan, impervious to sweaty fingers (~Rs. 6,000 - 9,000).");
addBullet("Secureye S-B8CB", "Reliable entry-level machine: TCP/IP & USB flash drive support (~Rs. 2,500 - 3,500).");

const pdfBuffer = doc.output("arraybuffer");
fs.writeFileSync("UNIVO_BIOMETRIC_SETUP_GUIDE.pdf", Buffer.from(pdfBuffer));
console.log("PDF created successfully: UNIVO_BIOMETRIC_SETUP_GUIDE.pdf");
