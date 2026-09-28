import { getGymSettings } from "./settings";
import { formatDate } from "./dateUtils";

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
  const template = settings.whatsappInvite || "💪 *Welcome to {gym_name}!*\n\nPlease complete your membership registration form, photo upload & liability waiver using this direct link:\n\n🔗 {link}\n\n⚠️ *Important:* This secure registration link expires in 10 minutes.\nLet's get stronger together! 🔥";
  return template
    .replace(/{gym_name}/g, actualGym)
    .replace(/{link}/g, link);
}

export function getDaysLeftPhrase(daysLeft) {
  if (daysLeft === undefined || daysLeft === null) return "soon";
  const num = Number(daysLeft);
  if (num === 0) return "today";
  if (num === 1) return "tomorrow (in 1 day)";
  if (num === 2) return "in 2 days";
  if (num === 3) return "in 3 days";
  if (num > 0) return `in ${num} days`;
  if (num === -1) return "yesterday";
  return `${Math.abs(num)} days ago`;
}

export function generateRenewalReminderMessage(memberName, planName, expiryDate, amount, daysLeft = null) {
  const settings = getGymSettings();
  const template = settings.whatsappReminder || "⚠️ *Gym Membership Ending Soon - {gym_name}*\n\nHi {name},\nYour membership for *{plan}* is ending {days_left} (on *{expiry}*).\nRenewal Amount: ₹{amount}.\n\nRenew today to maintain your workout consistency without disruption! 💪🔥\n— {gym_name}";
  const daysPhrase = getDaysLeftPhrase(daysLeft);
  const daysNumber = daysLeft !== null && daysLeft !== undefined ? String(daysLeft) : daysPhrase;

  return template
    .replace(/{name}/g, memberName || "Athlete")
    .replace(/{plan}/g, planName || "Gym Plan")
    .replace(/{expiry}/g, formatDate(expiryDate) || "upcoming date")
    .replace(/{days_left}/g, daysPhrase)
    .replace(/{days}/g, daysNumber)
    .replace(/{amount}/g, amount || "0")
    .replace(/{due_amount}/g, amount || "0")
    .replace(/{gym_name}/g, settings.gymName || "UNIVO GYM");
}

export function generatePtRenewalReminderMessage(memberName, ptPlanName, trainerName, expiryDate, amount, daysLeft = null) {
  const settings = getGymSettings();
  const template = settings.whatsappPtReminder || "✨ *Personal Training (PT) Ending Soon - {gym_name}*\n\nHi {name},\nYour 1-on-1 Personal Training package with *Coach {trainer}* ({plan}) is ending {days_left} (on *{expiry}*).\nRenewal Amount: ₹{amount}.\n\nRenew your PT package today to keep achieving your personal transformation goals! 🎯🔥\n— {gym_name}";
  const daysPhrase = getDaysLeftPhrase(daysLeft);
  const daysNumber = daysLeft !== null && daysLeft !== undefined ? String(daysLeft) : daysPhrase;

  return template
    .replace(/{name}/g, memberName || "Athlete")
    .replace(/{trainer}/g, trainerName || "Personal Trainer")
    .replace(/{plan}/g, ptPlanName || "1-on-1 PT Plan")
    .replace(/{expiry}/g, formatDate(expiryDate) || "upcoming date")
    .replace(/{days_left}/g, daysPhrase)
    .replace(/{days}/g, daysNumber)
    .replace(/{amount}/g, amount || "0")
    .replace(/{gym_name}/g, settings.gymName || "UNIVO GYM");
}

export function generatePartialDueReminderMessage(memberName, dueAmount, planName) {
  const settings = getGymSettings();
  const template = settings.whatsappPartialDue || "⚠️ *Payment Reminder - {gym_name}*\n\nHi {name},\nThis is a friendly reminder regarding your pending fee balance for *{plan}*.\n\n💰 *Remaining Due: ₹{amount}*\n\nPlease clear your balance at the gym reception or via UPI.\nThank you! Keep training hard! 💪\n— {gym_name}";
  return template
    .replace(/{name}/g, memberName || "Athlete")
    .replace(/{plan}/g, planName || "Membership")
    .replace(/{amount}/g, dueAmount || "0")
    .replace(/{due_amount}/g, dueAmount || "0")
    .replace(/{gym_name}/g, settings.gymName || "UNIVO GYM");
}

export function getDaysExpiredPhrase(daysExpired) {
  const num = Math.abs(Number(daysExpired || 1));
  if (num === 1) return "yesterday (1 day ago)";
  return `${num} days ago`;
}

export function getDaysOverduePhrase(daysOverdue) {
  const num = Math.abs(Number(daysOverdue || 3));
  return `${num} days`;
}

export function generateExpiredMessage(memberName, planName, expiryDate, amount, daysExpired = 1) {
  const settings = getGymSettings();
  const template = settings.whatsappExpired || "🚨 *Gym Membership Expired - {gym_name}*\n\nHi {name},\nYour gym membership for *{plan}* has expired {days_expired} (on *{expiry}*).\nRenewal Amount: ₹{amount}.\n\nRenew your membership today to restart your workout sessions and keep your fitness journey going! 💪🔥\n— {gym_name}";
  const daysPhrase = getDaysExpiredPhrase(daysExpired);
  const daysNumber = String(Math.abs(Number(daysExpired || 1)));

  return template
    .replace(/{name}/g, memberName || "Athlete")
    .replace(/{plan}/g, planName || "Gym Plan")
    .replace(/{expiry}/g, formatDate(expiryDate) || "recent date")
    .replace(/{days_expired}/g, daysPhrase)
    .replace(/{days}/g, daysNumber)
    .replace(/{amount}/g, amount || "0")
    .replace(/{due_amount}/g, amount || "0")
    .replace(/{gym_name}/g, settings.gymName || "UNIVO GYM");
}

export function generatePtExpiredMessage(memberName, ptPlanName, trainerName, expiryDate, amount, daysExpired = 1) {
  const settings = getGymSettings();
  const template = settings.whatsappPtExpired || "🚨 *Personal Training (PT) Expired - {gym_name}*\n\nHi {name},\nYour 1-on-1 Personal Training package with *Coach {trainer}* ({plan}) has expired {days_expired} (on *{expiry}*).\nRenewal Amount: ₹{amount}.\n\nPlease renew your PT package today so you don't miss your training slots with Coach {trainer}! 🎯🔥\n— {gym_name}";
  const daysPhrase = getDaysExpiredPhrase(daysExpired);
  const daysNumber = String(Math.abs(Number(daysExpired || 1)));

  return template
    .replace(/{name}/g, memberName || "Athlete")
    .replace(/{trainer}/g, trainerName || "Personal Trainer")
    .replace(/{plan}/g, ptPlanName || "1-on-1 PT Plan")
    .replace(/{expiry}/g, formatDate(expiryDate) || "recent date")
    .replace(/{days_expired}/g, daysPhrase)
    .replace(/{days}/g, daysNumber)
    .replace(/{amount}/g, amount || "0")
    .replace(/{due_amount}/g, amount || "0")
    .replace(/{gym_name}/g, settings.gymName || "UNIVO GYM");
}

export function generateOverdueReminderMessage(memberName, planName, daysOverdue, amount, expiryDate = null) {
  const settings = getGymSettings();
  const template = settings.whatsappOverdue || "⛔ *Membership Overdue Notice - {gym_name}*\n\nHi {name},\nYour gym membership for *{plan}* has ended and is now *{days_overdue} overdue* (ended on *{expiry}*).\nOutstanding Renewal Amount: ₹{amount}.\n\nPlease clear your renewal today at the reception or via UPI to reactivate your access! 🔥\n— {gym_name}";
  const daysPhrase = getDaysOverduePhrase(daysOverdue);
  const daysNumber = String(Math.abs(Number(daysOverdue || 3)));

  return template
    .replace(/{name}/g, memberName || "Athlete")
    .replace(/{plan}/g, planName || "Gym Membership")
    .replace(/{expiry}/g, expiryDate ? formatDate(expiryDate) : "recent date")
    .replace(/{days_overdue}/g, daysPhrase)
    .replace(/{days}/g, daysNumber)
    .replace(/{amount}/g, amount || "0")
    .replace(/{due_amount}/g, amount || "0")
    .replace(/{gym_name}/g, settings.gymName || "UNIVO GYM");
}

export function generatePtOverdueReminderMessage(memberName, ptPlanName, trainerName, daysOverdue, amount, expiryDate = null) {
  const settings = getGymSettings();
  const template = settings.whatsappPtOverdue || "⛔ *Personal Training (PT) Overdue Notice - {gym_name}*\n\nHi {name},\nYour 1-on-1 Personal Training package with *Coach {trainer}* ({plan}) is now *{days_overdue} overdue*.\nRenewal Amount: ₹{amount}.\n\nPlease renew today at the gym desk to secure your coaching slot with Coach {trainer}! 🎯🔥\n— {gym_name}";
  const daysPhrase = getDaysOverduePhrase(daysOverdue);
  const daysNumber = String(Math.abs(Number(daysOverdue || 3)));

  return template
    .replace(/{name}/g, memberName || "Athlete")
    .replace(/{trainer}/g, trainerName || "Personal Trainer")
    .replace(/{plan}/g, ptPlanName || "1-on-1 PT Plan")
    .replace(/{expiry}/g, expiryDate ? formatDate(expiryDate) : "recent date")
    .replace(/{days_overdue}/g, daysPhrase)
    .replace(/{days}/g, daysNumber)
    .replace(/{amount}/g, amount || "0")
    .replace(/{due_amount}/g, amount || "0")
    .replace(/{gym_name}/g, settings.gymName || "UNIVO GYM");
}

export function generatePaymentReceiptMessage(memberName, amount, planName, date) {
  const settings = getGymSettings();
  const template = settings.whatsappReceipt || "🧾 *Payment Receipt - {gym_name}*\n\nMember: {name}\nPlan: {plan}\nPaid Amount: ₹{amount}\nDate: {date}\n\nThank you for training with us! Keep crushing your workouts! 💪";
  return template
    .replace(/{name}/g, memberName || "Athlete")
    .replace(/{plan}/g, planName || "Membership")
    .replace(/{amount}/g, amount || "0")
    .replace(/{date}/g, formatDate(date || new Date()))
    .replace(/{gym_name}/g, settings.gymName || "UNIVO GYM");
}

export function generateWelcomeMessage(memberName, planName) {
  const settings = getGymSettings();
  const template = settings.whatsappWelcome || "💪 *Welcome to {gym_name}!*\n\nHi {name},\nYour membership for *{plan}* has been successfully activated.\n\nThank you for choosing us! Let's get stronger together! 🔥";
  return template
    .replace(/{name}/g, memberName || "Athlete")
    .replace(/{plan}/g, planName || "Membership")
    .replace(/{gym_name}/g, settings.gymName || "UNIVO GYM");
}

export function generateBirthdayMessage(memberName) {
  const settings = getGymSettings();
  const template = settings.whatsappBirthday || "🎂 *Happy Birthday, {name}!* 🎉\n\nWishing you a fantastic year of strength, good health, and fitness gains! Have a wonderful day ahead! 💪✨\n— Team {gym_name}";
  return template
    .replace(/{name}/g, memberName || "Athlete")
    .replace(/{gym_name}/g, settings.gymName || "UNIVO GYM");
}

export function generateDemoEndingTodayMessage(name, planName, gymName = null) {
  const settings = getGymSettings();
  const template = settings.whatsappDemoEndingToday || "⏳ *Demo Session Ending Today - {gym_name}*\n\nHi {name}!\nYour free trial workout / demo session at *{gym_name}* is ending today!\n\nWe hope you had a great workout experience with us. Enroll today to take advantage of our exclusive member joining discount! 💪🔥\n— {gym_name}";
  return template
    .replace(/{name}/g, name || "Friend")
    .replace(/{plan}/g, planName || "Fitness Plan")
    .replace(/{gym_name}/g, gymName || settings.gymName || "UNIVO GYM");
}

export function generateDemoEndedMessage(name, planName, trainerName = null, gymName = null) {
  const settings = getGymSettings();
  const template = settings.whatsappDemoEnded || "🎯 *Demo Session Completed - {gym_name}*\n\nHi {name}!\nYour demo trial session at *{gym_name}* has ended.\n\nDon't let your fitness momentum break! Join our gym family today and start your journey towards your fitness goal ({plan}). Reply here to secure your special joining offer! 💪🔥\n— {gym_name}";
  return template
    .replace(/{name}/g, name || "Friend")
    .replace(/{plan}/g, planName || "Fitness Plan")
    .replace(/{trainer}/g, trainerName || "Coach")
    .replace(/{gym_name}/g, gymName || settings.gymName || "UNIVO GYM");
}

export function generateVisitFollowupMessage(name, planName) {
  const settings = getGymSettings();
  const template = settings.whatsappVisitFollowup || "👋 *Hello {name}! - {gym_name}*\n\nThank you for visiting us! We would love to have you as part of our fitness family.\n\nSpecial joining offers are active this week for *{plan}*. Feel free to reply here if you have any questions! 🔥";
  return template
    .replace(/{name}/g, name || "Friend")
    .replace(/{plan}/g, planName || "Fitness Plan")
    .replace(/{gym_name}/g, settings.gymName || "UNIVO GYM");
}

export function generateMemberLoginMessage(memberName, phone, password, portalUrl = null, gymName = null) {
  const settings = getGymSettings();
  const url = portalUrl || `${window.location.origin}/#/login`;
  const template = settings.whatsappMemberLogin || "🏋️ *Member Portal Login Credentials - {gym_name}*\n\nHi {name},\nHere are your member portal login credentials:\n\n📱 *Login Phone / ID:* {phone}\n🔑 *Password:* {password}\n🔗 *Portal Link:* {link}\n\nLog in anytime to view your plan validity, attendance record, and workout progress! 💪🔥\n— {gym_name}";
  return template
    .replace(/{name}/g, memberName || "Member")
    .replace(/{phone}/g, phone || "—")
    .replace(/{password}/g, password || "Member@123")
    .replace(/{link}/g, url)
    .replace(/{gym_name}/g, gymName || settings.gymName || "UNIVO GYM");
}

export function generateExtensionMessage(memberName, planName, extraDays, newExpiry, totalFee, paymentMode = "Cash", gymName = null) {
  const settings = getGymSettings();
  const template = settings.whatsappExtension || "📅 *Gym Membership Extended - {gym_name}*\n\nHello {name},\nYour gym membership has been extended by *+{extra_days} Days*!\n\n🗓️ *New Expiry Date:* {expiry}\n💰 *Extension Fee:* ₹{amount} ({mode})\n\nKeep up the fitness consistency! Stay active and fit! 💪🔥\n— {gym_name}";
  return template
    .replace(/{name}/g, memberName || "Athlete")
    .replace(/{plan}/g, planName || "Gym Plan")
    .replace(/{extra_days}/g, extraDays || "0")
    .replace(/{expiry}/g, formatDate(newExpiry))
    .replace(/{amount}/g, totalFee || "0")
    .replace(/{mode}/g, (paymentMode || "Cash").toUpperCase())
    .replace(/{gym_name}/g, gymName || settings.gymName || "UNIVO GYM");
}

export function generateInactiveMemberMessage(memberName, daysAbsent, planName, gymName = null) {
  const settings = getGymSettings();
  const template = settings.whatsappInactive || "🔥 *We Miss You at the Gym! - {gym_name}*\n\nHi {name},\nWe noticed that you haven't checked in for your workouts in the past *{days_absent} days*!\n\nConsistency is the key to achieving your fitness goals with *{plan}*. Come in today for an energizing workout session! 💪🔥\n— Team {gym_name}";
  return template
    .replace(/{name}/g, memberName || "Athlete")
    .replace(/{days_absent}/g, daysAbsent || "7")
    .replace(/{plan}/g, planName || "your membership")
    .replace(/{gym_name}/g, gymName || settings.gymName || "UNIVO GYM");
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
  const dateStr = formatDate(date || new Date());

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

export function generatePtAddonReceiptMessage({
  memberName = "Athlete",
  gymName = "",
  ptPlanName = "1-on-1 PT Package",
  trainerName = "Personal Trainer",
  ptSlot = "",
  startDate = "",
  expiryDate = "",
  durationDays = 30,
  amount = 0,
  paidAmount = 0,
  dueAmount = 0,
  paymentMode = "Cash",
  billId = "",
  receiptLink = "",
  loginEmail = "",
  loginPassword = "",
}) {
  const settings = getGymSettings();
  const gym = gymName || settings.gymName || "UNIVO GYM MANAGEMENT";
  const dateStr = formatDate(new Date());

  let msg = `🧾 *OFFICIAL PERSONAL TRAINING (PT) BILL & RECEIPT*\n*${gym}*\n\n`;
  msg += `Dear *${memberName}*,\nCongratulations on starting your dedicated 1-on-1 Personal Training Transformation with *Coach ${trainerName}*! Here are your official package & billing details:\n\n`;
  msg += `🏋️ *Personal Coach:* Coach ${trainerName}\n`;
  if (ptSlot) msg += `⏰ *PT Shift / Slot:* ${ptSlot}\n`;
  msg += `📋 *PT Package:* ${ptPlanName}\n`;
  if (startDate) msg += `📅 *PT Start Date:* ${formatDate(startDate)}\n`;
  if (expiryDate) msg += `🎯 *PT Valid Till:* ${formatDate(expiryDate)} (${durationDays} Days)\n`;
  msg += `💰 *Total Package Fee:* ₹${Number(amount).toLocaleString("en-IN")}\n`;
  msg += `✅ *Amount Paid:* ₹${Number(paidAmount).toLocaleString("en-IN")} (${paymentMode.toUpperCase()})\n`;
  if (Number(dueAmount) > 0) {
    msg += `⚠️ *Balance Due:* ₹${Number(dueAmount).toLocaleString("en-IN")}\n`;
  } else {
    msg += `✨ *Payment Status:* VERIFIED & PAID IN FULL\n`;
  }
  if (billId) msg += `🔖 *Bill / Invoice No:* #${billId}\n`;
  msg += `📅 *Receipt Date:* ${dateStr}\n\n`;
  if (loginEmail && loginPassword) {
    msg += `🔑 *Your PT Member App Credentials:*\n• Login ID / Phone: *${loginEmail}*\n• Password: *${loginPassword}*\n_Use these credentials to sign in and interact with Coach ${trainerName} for diet & workouts!_\n\n`;
  }
  if (receiptLink) {
    msg += `📄 *View & Download Digital Bill Online:*\n${receiptLink}\n\n`;
  }
  msg += `Gym floor access remains active as per your membership. Stay dedicated and crush your fitness goals! 🔥💪\n— *${gym}*`;
  return msg;
}

export function generateServiceAddonReceiptMessage({
  memberName = "Member",
  gymName = "",
  serviceName = "Gym Facility",
  category = "Amenity",
  months = 1,
  monthlyRate = 0,
  startDate = "",
  endDate = "",
  amount = 0,
  paidAmount = 0,
  dueAmount = 0,
  paymentMode = "Cash",
  billId = "",
  receiptLink = "",
}) {
  const settings = getGymSettings();
  const gym = gymName || settings.gymName || "UNIVO GYM MANAGEMENT";
  const dateStr = formatDate(new Date());

  let msg = `🧾 *OFFICIAL GYM SERVICE INVOICE & RECEIPT*\n*${gym}*\n\n`;
  msg += `Dear *${memberName}*,\nYour gym facility subscription has been activated successfully! Here are your official service invoice details:\n\n`;
  msg += `🛎️ *Service / Amenity:* ${serviceName}\n`;
  msg += `📂 *Category:* ${category}\n`;
  msg += `⏳ *Duration:* ${months} Month${months > 1 ? "s" : ""} (@ ₹${Number(monthlyRate).toLocaleString("en-IN")}/month)\n`;
  if (startDate) msg += `📅 *Service Start Date:* ${formatDate(startDate)}\n`;
  if (endDate) msg += `🎯 *Service Valid Till:* ${formatDate(endDate)}\n`;
  msg += `💰 *Total Service Fee:* ₹${Number(amount).toLocaleString("en-IN")}\n`;
  msg += `✅ *Amount Paid:* ₹${Number(paidAmount).toLocaleString("en-IN")} (${paymentMode.toUpperCase()})\n`;
  if (Number(dueAmount) > 0) {
    msg += `⚠️ *Balance Due:* ₹${Number(dueAmount).toLocaleString("en-IN")}\n`;
  } else {
    msg += `✨ *Payment Status:* PAID IN FULL\n`;
  }
  if (billId) msg += `🔖 *Invoice No:* #${billId}\n`;
  msg += `📅 *Billing Date:* ${dateStr}\n\n`;
  if (receiptLink) {
    msg += `📄 *View & Download Digital Bill:*\\n${receiptLink}\\n\\n`;
  }
  msg += `Enjoy premium access to your gym facilities! If you need any assistance, reach out to the gym reception.\n— *${gym}*`;
  return msg;
}