export function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function isExpired(expiresAt) {
  if (!expiresAt) return true;
  return Date.now() > expiresAt;
}

export function getTimeRemaining(expiresAt) {
  if (!expiresAt) return 0;
  const diff = Math.floor((expiresAt - Date.now()) / 1000);
  return diff > 0 ? diff : 0;
}
