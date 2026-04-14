import express from "express";
import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use((req, res, next) => { res.header("Access-Control-Allow-Origin", "*"); res.header("Access-Control-Allow-Headers", "Content-Type"); next(); });

let sb = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  console.log("✓ Supabase connected");
} else {
  console.log("⚠ No Supabase — using in-memory storage (reels lost on restart)");
}

const tw = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
const LINK_RE = /https?:\/\/[^\s]+/i;

const sessions = {};
const memReels = [];

function phone(from) { return from.replace("whatsapp:", ""); }

async function send(to, body) {
  const clean = to.replace(/^whatsapp:/i, "");
  return tw.messages.create({
    from: `whatsapp:${process.env.TWILIO_WA_NUMBER}`,
    to: `whatsapp:${clean}`,
    body,
  });
}

function parseCreator(url = "") {
  const m = url.match(/instagram\.com\/([a-zA-Z0-9._]+)\//);
  if (m && !["p","reel","reels","stories","tv","explore"].includes(m[1])) return m[1];
  return null;
}

function parseDeadline(text = "") {
  const t = text.toLowerCase();
  const d = new Date();
  if (t.includes("today"))    return d.toISOString().split("T")[0];
  if (t.includes("tomorrow")) { d.setDate(d.getDate()+1); return d.toISOString().split("T")[0]; }
  if (t.includes("week"))     { d.setDate(d.getDate()+7); return d.toISOString().split("T")[0]; }
  if (t.includes("month"))    { d.setMonth(d.getMonth()+1); return d.toISOString().split("T")[0]; }
  const m = text.match(/(\d{1,2})[\s\/\-](\w+)/);
  if (m) { const p = new Date(`${m[2]} ${m[1]} ${d.getFullYear()}`); if (!isNaN(p)) return p.toISOString().split("T")[0]; }
  return null;
}

async function saveReel(data) {
  const reel = {
    id: Math.random().toString(36).slice(2,9),
    user_id: data.userId,
    url: data.url,
    creator: data.creator || null,
    note: data.note || null,
    reminder: data.reminder || null,
    status: "saved",
    created_at: new Date().toISOString(),
  };
  if (sb) {
    const { error } = await sb.from("reels").insert(reel);
    if (error) { console.error("DB:", error.message); memReels.push(reel); }
    else console.log("Saved to Supabase:", reel.url);
  } else {
    memReels.push(reel);
    console.log("Saved to memory:", reel.url);
  }
  return reel;
}

// ── WhatsApp webhook ──────────────────────────────────────────────────────────
app.post("/bot", async (req, res) => {
  res.sendStatus(200);
  const from    = req.body.From || "";
  const rawBody = (req.body.Body || "").trim();
  const userId  = phone(from);
  console.log(`→ [${userId}] ${rawBody}`);

  try {
    const session = sessions[userId] || { step: "idle" };
    const link    = rawBody.match(LINK_RE)?.[0];

    if (session.step === "idle" || !session.reelUrl) {
      if (!link) { await send(from, "Hey 👋 Send me any reel/video link and I'll save it for you."); return; }
      sessions[userId] = { step: "ask_action", reelUrl: link };
      await send(from, "✓ Got it!\n\nQuick — what do you want?\n\n1 — Just save it\n2 — Remind me about it\n3 — Save with a note");
      return;
    }

    if (session.step === "ask_action") {
      const n = rawBody.match(/^[123]/)?.[0];
      if (n === "1") {
        const r = await saveReel({ userId, url: session.reelUrl, creator: parseCreator(session.reelUrl) });
        sessions[userId] = { step: "idle" };
        await send(from, `Saved ✓\nOpen your Reely board to see it.\n\n${r.url.slice(0,50)}…`);
        return;
      }
      if (n === "2") { sessions[userId] = { ...session, step: "ask_when" }; await send(from, "When? Reply:\ntoday / tomorrow / this week / this month\nor a date like \"20 may\""); return; }
      if (n === "3") { sessions[userId] = { ...session, step: "ask_note" }; await send(from, "Write your note (why did you save this?):"); return; }
      await send(from, "Reply 1, 2, or 3 👆");
      return;
    }

    if (session.step === "ask_when") {
      const deadline = parseDeadline(rawBody);
      await saveReel({ userId, url: session.reelUrl, creator: parseCreator(session.reelUrl), reminder: deadline });
      sessions[userId] = { step: "idle" };
      await send(from, deadline ? `Saved ✓ Reminder set for ${deadline}.\nOpen your Reely board.` : `Saved ✓ (couldn't parse date — no reminder set).`);
      return;
    }

    if (session.step === "ask_note") {
      await saveReel({ userId, url: session.reelUrl, creator: parseCreator(session.reelUrl), note: rawBody });
      sessions[userId] = { step: "idle" };
      await send(from, `Saved with your note ✓\nOpen your Reely board.`);
      return;
    }

  } catch (err) {
    console.error("Error:", err.message);
    sessions[userId] = { step: "idle" };
    await send(from, "Something went wrong. Send the link again.");
  }
});

// ── AI proxy (used by dashboard) ──────────────────────────────────────────────
app.post("/ai", async (req, res) => {
  const { messages, system } = req.body;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system, messages }),
    });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Fetch reels for dashboard ─────────────────────────────────────────────────
app.get("/reels/:userId", async (req, res) => {
  const { userId } = req.params;
  if (sb) {
    const { data, error } = await sb.from("reels").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }
  return res.json(memReels.filter(r => r.user_id === userId));
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ ok: true, reels_in_memory: memReels.length }));

app.listen(process.env.PORT || 3000, () => {
  console.log(`\n🚀 Reely bot live on port ${process.env.PORT || 3000}`);
  console.log(`   POST /bot    — Twilio webhook`);
  console.log(`   POST /ai     — AI proxy`);
  console.log(`   GET  /reels/:userId — fetch reels\n`);
});
