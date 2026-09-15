import { escapeHtml } from "./security.js";

/**
 * Booking enquiries go out through Resend's EU region and land in the client's own
 * mailbox. Reply-To is the enquirer, so Konstantinos just hits reply.
 *
 * The From address must be a domain he controls with SPF, DKIM and DMARC set up -
 * never the enquirer's address, which would be a spoof and would get the mail
 * filtered. Deliverability into Hotmail is the most likely silent failure point on
 * this whole site: send a real test message before launch (see docs/LAUNCH.md).
 */
export async function sendBooking({ apiKey, from, to, enquiry, serviceName, siteOrigin }) {
  const subject = `Booking request - ${enquiry.name}`;

  const rows = [
    ["Name", enquiry.name],
    ["Email", enquiry.email],
    ["Phone / WhatsApp", enquiry.phone || "-"],
    ["Massage", serviceName || "Not specified - asked for a suggestion"],
    ["Preferred time", enquiry.when || "-"],
    ["Language of the page", enquiry.locale],
  ];

  const text =
    `New booking request from ${siteOrigin}\n\n` +
    rows.map(([k, v]) => `${k}: ${v}`).join("\n") +
    (enquiry.message ? `\n\nMessage:\n${enquiry.message}` : "") +
    `\n\n---\nReply straight to this email and it goes to ${enquiry.email}.\n`;

  const html =
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;color:#14303A">` +
    `<h2 style="font-size:18px;margin:0 0 12px">New booking request</h2>` +
    `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse">` +
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 16px 4px 0;color:#3F5B66;vertical-align:top"><strong>${escapeHtml(k)}</strong></td>` +
          `<td style="padding:4px 0">${escapeHtml(v)}</td></tr>`
      )
      .join("") +
    `</table>` +
    (enquiry.message
      ? `<p style="margin:16px 0 4px;color:#3F5B66"><strong>Message</strong></p>` +
        `<p style="white-space:pre-wrap;margin:0;padding:12px;background:#F3EDE4;border-radius:8px">${escapeHtml(
          enquiry.message
        )}</p>`
      : "") +
    `<p style="margin-top:20px;font-size:13px;color:#3F5B66">Reply straight to this email and it goes to ${escapeHtml(
      enquiry.email
    )}.</p></div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: enquiry.email,
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err = new Error(`resend responded ${res.status}`);
    err.detail = detail.slice(0, 500);
    throw err;
  }
  return res.json().catch(() => ({}));
}
