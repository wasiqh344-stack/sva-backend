const express = require("express");
const db = require("../db");
const { sendContactNotification } = require("../mailer");

const router = express.Router();

const insertContact = db.prepare(`
  INSERT INTO contacts (name, email, service, message)
  VALUES (@name, @email, @service, @message)
`);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/contact
router.post("/", async (req, res) => {
  const { name, email, service, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Name, email, and message are required." });
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }
  if (String(name).length > 120 || String(message).length > 5000) {
    return res.status(400).json({ error: "Input too long." });
  }

  try {
    const info = insertContact.run({
      name: String(name).trim(),
      email: String(email).trim(),
      service: service ? String(service).trim() : null,
      message: String(message).trim(),
    });

    // Fire-and-forget email notification — don't block the response on it
    sendContactNotification({ name, email, service, message }).catch(() => {});

    return res.status(201).json({
      success: true,
      id: info.lastInsertRowid,
      message: "Thanks! Your message has been received — we'll get back to you soon.",
    });
  } catch (err) {
    console.error("[contact] Failed to save submission:", err.message);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

module.exports = router;
