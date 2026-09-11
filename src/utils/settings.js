// Gym Settings storage helper
const DEFAULT_SETTINGS = {
  gymName: "UNIVO GYM MANAGEMENT",
  tagline: "Stronger Today, Healthier Tomorrow",
  phone: "+91 9196302375",
  address: "Main Branch, Univo Fitness Centre",
  whatsappWelcome: "💪 *Welcome to {gym_name}!*\n\nHi {name},\nYour membership for *{plan}* has been successfully activated.\n\nThank you for choosing us! Let's get stronger together! 🔥",
  whatsappReminder: "⚠️ *Gym Renewal Reminder*\n\nHi {name},\nYour membership for *{plan}* is expiring on *{expiry}*.\nPending/Renewal Amount: ₹{amount}.\n\nRenew today to maintain your workout consistency! 💪\n— {gym_name}",
  whatsappReceipt: "🧾 *Payment Receipt - {gym_name}*\n\nMember: {name}\nPlan: {plan}\nPaid: ₹{amount}\nDate: {date}\n\nThank you for training with us!",
  ownerSignatureName: "Authorized Signatory",
  ownerSignatureTitle: "Gym Manager / Owner"
};

export function getGymSettings() {
  try {
    const saved = localStorage.getItem("univo_gym_settings");
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_SETTINGS;
}

export function saveGymSettings(settings) {
  try {
    localStorage.setItem("univo_gym_settings", JSON.stringify(settings));
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}