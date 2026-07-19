const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const findAdminByEmail = db.prepare("SELECT * FROM admins WHERE email = ?");
const insertAdmin = db.prepare(
  "INSERT INTO admins (email, password_hash) VALUES (?, ?)"
);

function signToken(admin) {
  return jwt.sign(
    { id: admin.id, email: admin.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// POST /api/admin/signup
// Protected by a shared secret header so random visitors can't self-register as admin.
router.post("/signup", async (req, res) => {
  const { email, password } = req.body || {};
  const signupSecret = req.headers["x-signup-secret"];

  if (!process.env.ADMIN_SIGNUP_SECRET || signupSecret !== process.env.ADMIN_SIGNUP_SECRET) {
    return res.status(403).json({ error: "Invalid or missing signup secret." });
  }
  if (!email || !password || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Valid email and password are required." });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }
  if (findAdminByEmail.get(email)) {
    return res.status(409).json({ error: "An admin with this email already exists." });
  }

  const hash = await bcrypt.hash(password, 12);
  const info = insertAdmin.run(email.trim().toLowerCase(), hash);
  const token = signToken({ id: info.lastInsertRowid, email });

  return res.status(201).json({ success: true, token });
});

// POST /api/admin/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const admin = findAdminByEmail.get(String(email).trim().toLowerCase());
  if (!admin) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = signToken(admin);
  return res.json({ success: true, token, email: admin.email });
});

// GET /api/admin/me — verify token / get current admin
router.get("/me", requireAuth, (req, res) => {
  res.json({ id: req.admin.id, email: req.admin.email });
});

// GET /api/admin/messages — list contact submissions (protected)
router.get("/messages", requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM contacts ORDER BY created_at DESC")
    .all();
  res.json({ messages: rows });
});

// PATCH /api/admin/messages/:id — update status (new | read | replied)
router.patch("/messages/:id", requireAuth, (req, res) => {
  const { status } = req.body || {};
  const allowed = ["new", "read", "replied"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${allowed.join(", ")}` });
  }
  const info = db
    .prepare("UPDATE contacts SET status = ? WHERE id = ?")
    .run(status, req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: "Message not found." });
  }
  res.json({ success: true });
});

// DELETE /api/admin/messages/:id
router.delete("/messages/:id", requireAuth, (req, res) => {
  const info = db.prepare("DELETE FROM contacts WHERE id = ?").run(req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: "Message not found." });
  }
  res.json({ success: true });
});

module.exports = router;
