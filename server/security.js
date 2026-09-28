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

// The only third party ever loaded is Google Maps, and only inside the single
// iframe on the studio-map section (home and location pages) - frame-src is
// scoped to exactly that origin. Everything else stays as strict as before: no
// CDN, no analytics, no hotlinked font, no inline style or script anywhere.
export const CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "frame-src https://www.google.com",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

// One-way, salted hash of the client address. The plain IP is never written to a
// log line; this is only ever compared against itself, for rate limiting and for
// spotting a repeated abuser. It cannot be reversed back into an address.
export function hashIp(ip, salt) {
  return crypto.createHmac("sha256", salt).update(String(ip)).digest("base64url").slice(0, 16);
}
