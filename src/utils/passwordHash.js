/**
 * Demo-only password hashing for local employee accounts (Web Crypto SHA-256).
 * Replace with backend auth when /employees API ships.
 */
function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomSalt(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toHex(arr);
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}

export async function hashPassword(password, salt = randomSalt()) {
  const hash = await sha256Hex(`${salt}:${password}`);
  return { salt, hash };
}

export async function verifyPassword(password, salt, hash) {
  if (!password || !salt || !hash) return false;
  const next = await sha256Hex(`${salt}:${password}`);
  return next === hash;
}
