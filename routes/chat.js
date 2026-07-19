const express = require("express");
const db = require("../db");

const router = express.Router();

const insertChatLog = db.prepare(
  "INSERT INTO chat_logs (session_id, role, text) VALUES (?, ?, ?)"
);

const SYSTEM_PROMPT = `You are the SVA Design website assistant. SVA Design (Smart VA Design) is a
creative and digital agency based in North Nazimabad, Karachi, Pakistan, founded in February 2025.
It serves both local Pakistani clients and international clients.

Services offered: Graphic Design (logos, posters, packaging, print), Web Development (responsive
sites and custom platforms), Social Media Management (content calendars, posting, community growth),
Video Editing (reels, ads, promo videos), Branding & Identity (full visual identity systems), and
Virtual Assistant services (admin, scheduling, inbox support).

Pricing tiers: Starter ($49/project), Standard ($99/month, most popular), Pro ($199/project),
and Custom (contact for a quote).

Contact: svadesign@gmail.com, +92 319311610.

Be friendly, concise, and helpful. Answer questions about services and pricing directly. If asked
something you don't know, suggest the person use the contact form or email svadesign@gmail.com.
Keep replies under ~80 words unless more detail is clearly needed.`;

// POST /api/chat
// Body: { messages: [{ role: "user" | "assistant", content: string }, ...] }
router.post("/", async (req, res) => {
  const { messages, sessionId } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required." });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      reply: "Chat isn't configured yet — please set ANTHROPIC_API_KEY on the server.",
    });
  }

  // Keep only the last 12 turns to bound cost/latency, and clamp message length
  const trimmed = messages.slice(-12).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || "").slice(0, 2000),
  }));

  try {
    const lastUser = trimmed[trimmed.length - 1];
    if (lastUser) {
      insertChatLog.run(sessionId || null, "user", lastUser.content);
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: trimmed,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[chat] Anthropic API error:", response.status, errText);
      return res.status(502).json({ reply: "Sorry, I'm having trouble responding right now." });
    }

    const data = await response.json();
    const reply = (data.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim() || "Sorry, I couldn't come up with a reply.";

    insertChatLog.run(sessionId || null, "assistant", reply);

    return res.json({ reply });
  } catch (err) {
    console.error("[chat] Unexpected error:", err.message);
    return res.status(500).json({ reply: "Something went wrong. Please try again shortly." });
  }
});

module.exports = router;
