const { Resend } = require("resend");

let resendClient = null;

function getClient() {
  if (resendClient) return resendClient;

  if (!process.env.RESEND_API_KEY) {
    console.warn(
      "[mailer] RESEND_API_KEY not set — email notifications are disabled."
    );
    return null;
  }

  resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

async function sendContactNotification({ name, email, service, message }) {
  const client = getClient();
  if (!client) return { sent: false, reason: "mailer_not_configured" };

  const to = process.env.NOTIFY_EMAIL;
  if (!to) return { sent: false, reason: "NOTIFY_EMAIL not set" };

  try {
    const { data, error } = await client.emails.send({
      from: "SVA Design Website <onboarding@resend.dev>",
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

    if (error) {
      console.error("[mailer] Resend error:", error.message || error);
      return { sent: false, reason: error.message || String(error) };
    }

    return { sent: true, id: data?.id };
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
