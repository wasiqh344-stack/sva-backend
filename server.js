require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const contactRoutes = require("./routes/contact");
const adminRoutes = require("./routes/admin");
const chatRoutes = require("./routes/chat");

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Core middleware ----
app.use(express.json({ limit: "200kb" }));

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
  })
);

// ---- Rate limiting on public-facing endpoints ----
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: "Too many submissions. Please try again later." },
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { reply: "You're sending messages too fast — please slow down." },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Please try again later." },
});

// ---- Static admin panel ----
app.use("/admin", express.static(path.join(__dirname, "public", "admin")));

// ---- API routes ----
app.use("/api/contact", contactLimiter, contactRoutes);
app.use("/api/chat", chatLimiter, chatRoutes);
app.use(
  "/api/admin/login",
  loginLimiter,
  (req, res, next) => next() // limiter applies only to this path; router below handles it
);
app.use("/api/admin", adminRoutes);

// ---- Health check ----
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ---- 404 fallback for API ----
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.listen(PORT, () => {
  console.log(`SVA Design backend running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});
