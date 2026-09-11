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

export function generatePaymentReceiptMessage(memberName, amount, planName, date) {
  const settings = getGymSettings();
  return `🧾 *Payment Confirmation - ${settings.gymName}*\n\nHi ${memberName},\nWe have successfully received your payment of *₹${amount}* for *${planName}* on ${date || "today"}.\n\nThank you for choosing us! Keep crushing your workouts! 💪`;
}