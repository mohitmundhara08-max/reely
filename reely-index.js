// ============================================================
//  REELY — WhatsApp Bot Backend
//  Stack: Node.js · Twilio WhatsApp API · OpenAI · Supabase
//  File: index.js
// ============================================================

import express from "express";
import twilio from "twilio";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ── Clients ──────────────────────────────────────────────────
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// ── Helpers ───────────────────────────────────────────────────
const INSTAGRAM_REGEX = /https?:\/\/(www\.)?instagram\.com\/(reel|p|reels)\/[A-Za-z0-9_-]+\/?/i;

function isInstagramReel(text) {
  return INSTAGRAM_REGEX.test(text);
}

async function sendWhatsApp(to, body) {
  return twilioClient.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${to}`,
    body,
  });
}

// ── Session Store (in-memory; swap for Redis in prod) ────────
const sessions = new Map();

function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, { state: "idle", reelUrl: null, lastResult: null });
  }
  return sessions.get(userId);
}

function setSession(userId, updates) {
  const session = getSession(userId);
  sessions.set(userId, { ...session, ...updates });
}

// ── AI Processing ─────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Reely, an execution engine that converts Instagram reel content into actionable outputs.
The user will provide a reel URL and a mode. Respond ONLY with a valid JSON object — no preamble, no markdown.

For mode "summary": Return { "summary": "max 2 sentences", "keyIdea": "1 line", "category": "business|content|health|learning" }

For mode "actions": Return { "summary": "max 2 sentences", "keyIdea": "1 line", "steps": ["step1", "step2", "step3", "step4", "step5"], "category": "business|content|health|learning" }

For mode "content": Return { "contentIdea": "1 specific content idea", "format": "reel|carousel|thread|blog", "hook": "opening line for the content", "outline": ["point1", "point2", "point3"], "category": "content" }

Rules:
- Be specific, not generic. Reference the actual topic.
- Action steps must be immediately doable. No vague advice.
- If you cannot infer the reel content from the URL, make reasonable assumptions about popular topics.
- Category must be exactly one of: business, content, health, learning`;

async function processReel(reelUrl, mode) {
  const userPrompt = `Reel URL: ${reelUrl}\nMode: ${mode}\n\nConvert this reel into structured output.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 600,
    temperature: 0.7,
  });

  const raw = response.choices[0].message.content.trim();
  return JSON.parse(raw);
}

function formatOutput(result, mode) {
  const categoryEmojis = { business: "💼", content: "✏️", health: "💪", learning: "📚" };
  const catEmoji = categoryEmojis[result.category] || "📌";

  if (mode === "summary") {
    return `🎯 *REELY SUMMARY*\n\n📋 *Summary*\n${result.summary}\n\n💡 *Key Idea*\n${result.keyIdea}\n\n${catEmoji} *Category:* ${result.category.toUpperCase()}`;
  }

  if (mode === "actions") {
    const steps = result.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
    return `🎯 *REELY OUTPUT*\n\n📋 *Summary*\n${result.summary}\n\n💡 *Key Idea*\n${result.keyIdea}\n\n⚡ *Action Steps*\n${steps}\n\n${catEmoji} *Category:* ${result.category.toUpperCase()}`;
  }

  if (mode === "content") {
    const outline = result.outline.map((p, i) => `${i + 1}. ${p}`).join("\n");
    return `🎯 *REELY CONTENT IDEA*\n\n✨ *Idea*\n${result.contentIdea}\n\n📱 *Format:* ${result.format.toUpperCase()}\n\n🎣 *Hook*\n_${result.hook}_\n\n📝 *Outline*\n${outline}`;
  }
}

const MENU_MESSAGE =
  "What do you want from this reel?\n\n1️⃣ Summary\n2️⃣ Action steps\n3️⃣ Content idea\n\nReply with 1, 2, or 3.";

const ACTION_MESSAGE =
  "What do you want to do with this?\n\nReply:\n💾 *save* — Store it\n✅ *tasks* — Add to task list\n⏰ *remind* — Set a reminder";

// ── DB Helpers ────────────────────────────────────────────────
async function saveReel({ userId, reelUrl, mode, output, category }) {
  const { error } = await supabase.from("reels").insert({
    user_id: userId,
    reel_url: reelUrl,
    mode,
    output: JSON.stringify(output),
    category,
    created_at: new Date().toISOString(),
    action_taken: false,
  });
  if (error) console.error("Supabase insert error:", error);
}

async function markActionTaken(userId, reelUrl) {
  const { error } = await supabase
    .from("reels")
    .update({ action_taken: true })
    .eq("user_id", userId)
    .eq("reel_url", reelUrl);
  if (error) console.error("Supabase update error:", error);
}

async function ensureUser(userId, phone) {
  const { data } = await supabase.from("users").select("id").eq("id", userId).single();
  if (!data) {
    await supabase.from("users").insert({ id: userId, phone, created_at: new Date().toISOString() });
  }
}

// ── Main Webhook ──────────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // Ack Twilio immediately

  const body = req.body.Body?.trim() ?? "";
  const from = req.body.From?.replace("whatsapp:", "") ?? "";
  const userId = from;

  try {
    await ensureUser(userId, from);
    const session = getSession(userId);

    // ── STATE: idle — waiting for a reel link ─────────────────
    if (session.state === "idle") {
      if (isInstagramReel(body)) {
        const reelUrl = body.match(INSTAGRAM_REGEX)[0];
        setSession(userId, { state: "awaiting_mode", reelUrl });
        await sendWhatsApp(from, `🎬 Got it! Processing your reel...\n\n${MENU_MESSAGE}`);
      } else {
        await sendWhatsApp(
          from,
          "👋 Welcome to *Reely*!\n\nPaste an Instagram reel link and I'll convert it into something you can actually _do_."
        );
      }
      return;
    }

    // ── STATE: awaiting_mode — user picks 1/2/3 ───────────────
    if (session.state === "awaiting_mode") {
      const modeMap = { "1": "summary", "2": "actions", "3": "content" };
      const mode = modeMap[body];

      if (!mode) {
        await sendWhatsApp(from, `Please reply with 1, 2, or 3.\n\n${MENU_MESSAGE}`);
        return;
      }

      setSession(userId, { state: "processing", mode });
      await sendWhatsApp(from, "⚡ Processing... this takes ~5 seconds.");

      const result = await processReel(session.reelUrl, mode);
      const formatted = formatOutput(result, mode);

      setSession(userId, { state: "awaiting_action", lastResult: result });
      await saveReel({ userId, reelUrl: session.reelUrl, mode, output: result, category: result.category });

      await sendWhatsApp(from, formatted);
      await sendWhatsApp(from, ACTION_MESSAGE);
      return;
    }

    // ── STATE: awaiting_action — save / tasks / remind ────────
    if (session.state === "awaiting_action") {
      const cmd = body.toLowerCase();

      if (cmd.includes("save")) {
        await sendWhatsApp(from, "💾 Saved! You can find this in your weekly digest.");
        setSession(userId, { state: "idle", reelUrl: null, lastResult: null });
        return;
      }

      if (cmd.includes("task")) {
        const steps = session.lastResult?.steps ?? [];
        if (steps.length > 0) {
          const taskList = steps.map((s, i) => `☐ ${s}`).join("\n");
          await sendWhatsApp(from, `✅ Added to your task list:\n\n${taskList}\n\nI'll nudge you tomorrow if you haven't started.`);
          await markActionTaken(userId, session.reelUrl);
        } else {
          await sendWhatsApp(from, "✅ Saved to your tasks!");
        }
        setSession(userId, { state: "idle", reelUrl: null, lastResult: null });
        return;
      }

      if (cmd.includes("remind")) {
        setSession(userId, { state: "awaiting_reminder_time" });
        await sendWhatsApp(from, "⏰ When should I remind you?\n\nReply like:\n*tomorrow 9am*\n*friday 6pm*\n*in 2 hours*");
        return;
      }

      await sendWhatsApp(from, `Please reply with:\n${ACTION_MESSAGE}`);
      return;
    }

    // ── STATE: awaiting_reminder_time ─────────────────────────
    if (session.state === "awaiting_reminder_time") {
      // In production: parse NLP time → schedule via cron/Supabase pg_cron
      await sendWhatsApp(
        from,
        `⏰ Reminder set for *${body}*!\n\nI'll send you the action steps right when it's time. Go crush it. 💪`
      );
      await markActionTaken(userId, session.reelUrl);
      setSession(userId, { state: "idle", reelUrl: null, lastResult: null });
      return;
    }

    // ── Fallback ──────────────────────────────────────────────
    await sendWhatsApp(from, "Paste an Instagram reel link to get started 👇");
    setSession(userId, { state: "idle" });
  } catch (err) {
    console.error("Webhook error:", err);
    await sendWhatsApp(from, "⚠️ Something went wrong. Try again or paste the reel link again.");
    setSession(userId, { state: "idle" });
  }
});

// ── Weekly Digest (call via cron job / pg_cron) ───────────────
app.post("/digest", async (req, res) => {
  try {
    const { data: users } = await supabase.from("users").select("id, phone");

    for (const user of users ?? []) {
      const { data: reels } = await supabase
        .from("reels")
        .select("*")
        .eq("user_id", user.id)
        .eq("action_taken", false)
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(5);

      if (!reels || reels.length === 0) continue;

      const list = reels
        .map((r, i) => {
          const output = JSON.parse(r.output);
          return `${i + 1}. ${output.keyIdea ?? output.contentIdea ?? "Saved reel"} (${r.category})`;
        })
        .join("\n");

      const msg = `📬 *Weekly Reely Digest*\n\nYou have *${reels.length} pending actions* from this week:\n\n${list}\n\n⚡ Pick ONE. Do it in the next hour. That's all.`;

      await sendWhatsApp(user.phone, msg);
    }

    res.json({ ok: true, processed: users?.length ?? 0 });
  } catch (err) {
    console.error("Digest error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Health ────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ service: "Reely", status: "running" }));

app.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Reely bot running on port ${process.env.PORT || 3000}`);
});
