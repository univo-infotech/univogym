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
  const link = `${baseUrl}/register/univo_main/${token}`;
  return `💪 *Welcome to ${gymName || "Univo Gym Management"}!*\n\nPlease complete your membership registration form and liability waiver using this link:\n🔗 ${link}\n\n⚠️ *Note:* This link is valid for 5 minutes only.\nLet's get stronger together!`;
}

export function generateRenewalReminderMessage(memberName, planName, expiryDate, amount) {
  return `Hi ${memberName}, your gym membership for *${planName}* is expiring on *${expiryDate}*. Renewal amount is ₹${amount}. Renew today to continue your workout streak without break! 💪`;
}
