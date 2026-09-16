import { getGymSettings } from "./settings";

export function formatPhone(phone) {
  if (!phone) return "";
  let clean = phone.toString().replace(/[^0-9]/g, "");
  if (clean.length === 10) clean = "91" + clean;
  return clean;
}

export function openWhatsApp(phone, message) {
  const formatted = formatPhone(phone);
  const encoded = encodeURIComponent(message || "");
  window.open(`https://wa.me/${formatted}?text=${encoded}`, "_blank");
}

export function generateMemberInviteMessage(gymName, token, baseUrl = window.location.origin) {
  const settings = getGymSettings();
  const actualGym = gymName || settings.gymName || "UNIVO GYM MANAGEMENT";
  const link = `${baseUrl}/#/register/univo_main/${token}`;
  return `💪 *Welcome to ${actualGym}!*\n\nPlease complete your membership registration form, photo upload & liability waiver using this direct link:\n\n🔗 ${link}\n\n⚠️ *Important:* This secure registration link expires in 5 minutes.\nLet's get stronger together! 🔥`;
}

export function generateRenewalReminderMessage(memberName, planName, expiryDate, amount) {
  const settings = getGymSettings();
  let template = settings.whatsappReminder;
  return template
    .replace("{name}", memberName || "Athlete")
    .replace("{plan}", planName || "Gym Plan")
    .replace("{expiry}", expiryDate || "upcoming date")
    .replace("{amount}", amount || "0")
    .replace("{gym_name}", settings.gymName);
}

export function generatePtRenewalReminderMessage(memberName, ptPlanName, trainerName, expiryDate, amount) {
  const settings = getGymSettings();
  let template = settings.whatsappPtReminder || "✨ *Personal Training (PT) Renewal Reminder*\n\nHi {name},\nYour 1-on-1 Personal Training package with *{trainer}* ({plan}) is expiring on *{expiry}*.\nRenewal Amount: ₹{amount}.\n\nRenew your PT package today to keep achieving your personal transformation goals! 🎯🔥\n— {gym_name}";
  return template
    .replace("{name}", memberName || "Athlete")
    .replace("{trainer}", trainerName || "Personal Trainer")
    .replace("{plan}", ptPlanName || "1-on-1 PT Plan")
    .replace("{expiry}", expiryDate || "upcoming date")
    .replace("{amount}", amount || "0")
    .replace("{gym_name}", settings.gymName);
}

export function generatePartialDueReminderMessage(memberName, dueAmount, planName) {
  const settings = getGymSettings();
  return `⚠️ *Payment Reminder - ${settings.gymName}*\n\nHi ${memberName || "Athlete"},\nThis is a friendly reminder regarding your pending fee balance for *${planName || "Membership"}*.\n\n💰 *Remaining Due: ₹${dueAmount}*\n\nPlease clear your balance at the gym reception or via UPI.\nThank you! Keep training hard! 💪`;
}

export function generateOverdueReminderMessage(memberName, planName, daysOverdue, amount) {
  const settings = getGymSettings();
  return `🚨 *Membership Overdue Alert - ${settings.gymName}*\n\nHi ${memberName || "Athlete"},\nYour gym membership for *${planName || "Membership"}* has ended *${daysOverdue || "few"} days ago* and is currently overdue.\n\n💵 *Renewal Amount: ₹${amount || "2,500"}*\n\nPlease renew today at the reception to restart your workout sessions and retain your slot! 🔥`;
}

export function generatePaymentReceiptMessage(memberName, amount, planName, date) {
  const settings = getGymSettings();
  return `🧾 *Payment Confirmation - ${settings.gymName}*\n\nHi ${memberName},\nWe have successfully received your payment of *₹${amount}* for *${planName}* on ${date || "today"}.\n\nThank you for choosing us! Keep crushing your workouts! 💪`;
}

export function generateSupplementSaleReceiptMessage({
  memberName = "Customer",
  productName = "Product",
  brand = "",
  quantity = 1,
  unitPrice = 0,
  totalAmount = 0,
  paymentMode = "Cash",
  date = "",
  trainerName = "",
  receiptLink = ""
}) {
  const settings = getGymSettings();
  const gym = settings.gymName || "UNIVO GYM MANAGEMENT";
  const dateStr = date || new Date().toLocaleDateString("en-IN");

  let msg = `🧾 *OFFICIAL STORE TAX INVOICE & BILL*\n*${gym}*\n\n`;
  msg += `Dear *${memberName}*,\nThank you for purchasing fitness products from our Gym Store! Here is your official bill:\n\n`;
  msg += `📦 *Item:* ${productName}\n`;
  if (brand) msg += `🏷️ *Brand:* ${brand}\n`;
  msg += `🔢 *Quantity:* ${quantity} ${quantity > 1 ? "Units" : "Unit"}\n`;
  msg += `💵 *Rate:* ₹${Number(unitPrice).toLocaleString("en-IN")}\n`;
  msg += `💰 *Total Amount Paid:* ₹${Number(totalAmount).toLocaleString("en-IN")}\n`;
  msg += `💳 *Payment Mode:* ${paymentMode.toUpperCase()}\n`;
  msg += `📅 *Date:* ${dateStr}\n`;
  if (trainerName) msg += `🏋️ *Referred By:* Coach ${trainerName}\n`;
  msg += `✨ *Status:* VERIFIED & PAID IN FULL\n\n`;
  if (receiptLink) {
    msg += `📄 *View & Download Official Digital Receipt:*\n${receiptLink}\n\n`;
  }
  msg += `Stay fit, healthy and keep crushing your fitness goals! 🔥💪\n— *${gym}*`;
  return msg;
}