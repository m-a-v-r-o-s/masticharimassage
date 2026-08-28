import crypto from "node:crypto";

export const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "x-frame-options": "DENY",
  "permissions-policy":
    "accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), " +
    "fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), " +
    "midi=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()",
};

// Nothing on this site loads from a third party: no CDN, no analytics, no embedded
// map, no hotlinked font. That makes a strict policy achievable rather than
// aspirational - which is why no template is allowed an inline style or script.
export const CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

// One-way, salted hash of the client address. The plain IP is never written to a
// log line; this is only ever compared against itself, for rate limiting and for
// spotting a repeated abuser. It cannot be reversed back into an address.
export function hashIp(ip, salt) {
  return crypto.createHmac("sha256", salt).update(String(ip)).digest("base64url").slice(0, 16);
}

export function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function makeStamp(secret) {
  const issued = Date.now().toString(36);
  return `${issued}.${sign(issued, secret)}`;
}

/**
 * A form that comes back faster than a human could fill it in, or on a token older
 * than a day, is rejected. This replaces a third-party captcha: the old site ran a
 * home-made arithmetic captcha, which is evidence the form did get abused, so the
 * trap stays even though nothing is being scored.
 */
export function checkStamp(stamp, secret, { minMs = 3000, maxMs = 86_400_000 } = {}) {
  if (typeof stamp !== "string" || !stamp.includes(".")) return "missing";
  const [issued, mac] = stamp.split(".");
  const expected = sign(issued, secret);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return "bad-signature";
  const age = Date.now() - parseInt(issued, 36);
  if (Number.isNaN(age)) return "bad-timestamp";
  if (age < minMs) return "too-fast";
  if (age > maxMs) return "expired";
  return null;
}

export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length || !a.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// C0 controls, DEL, and the C1 range. Stripped rather than escaped.
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g;

// Same, but keeping the newline: the message field is the only multi-line input,
// and stripping its line breaks would mangle what the enquirer actually wrote.
const CONTROL_CHARS_KEEP_NL = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g;

/**
 * Header injection is the live risk on an endpoint whose output becomes an email.
 * Control characters (CR and LF above all) are removed, and the result is capped.
 */
export function clean(value, maxLength) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(CONTROL_CHARS, "")
    .trim()
    .slice(0, maxLength);
}

export function cleanMultiline(value, maxLength) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/\t+/g, " ")
    .replace(CONTROL_CHARS_KEEP_NL, "")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

// Deliberately conservative: this only has to accept an address well enough to
// reply to it, and a false accept costs nothing worse than a bounced reply.
const EMAIL = /^[^\s@<>",;:\\]{1,64}@[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
export const isEmail = (v) => typeof v === "string" && v.length <= 200 && EMAIL.test(v);

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
  );
}
