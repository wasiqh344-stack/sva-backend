const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn(
      "[mailer] GMAIL_USER / GMAIL_APP_PASSWORD not set — email notifications are disabled."
    );
    return null;
  }

  // Explicit host/port config (more reliable on cloud hosts than the
  // generic "service: gmail" shortcut, which can time out on some platforms).
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true for port 465, false for 587
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    connectionTimeout: 15000, // 15s instead of default (often too short on cold cloud connections)
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });

  return transporter;
}

async function sendContactNotification({ name, email, service, message }) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "mailer_not_configured" };

  const to = process.env.NOTIFY_EMAIL || process.env.GMAIL_USER;

  try {
    await t.sendMail({
      from: `"SVA Design Website" <${process.env.GMAIL_USER}>`,
      to,
      replyTo: email,
      subject: `New inquiry: ${service || "General"} — ${name}`,
      text: `New contact form submission on svadesign.com

Name: ${name}
Email: ${email}
Service: ${service || "Not specified"}

Message:
${message}
`,
      html: `
        <h2>New contact form submission</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Service:</strong> ${escapeHtml(service || "Not specified")}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
      `,
    });
    return { sent: true };
  } catch (err) {
    console.error("[mailer] Failed to send notification email:", err.message);
    return { sent: false, reason: err.message };
  }
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = { sendContactNotification };