// ============================================================
//  REELY — WhatsApp Bot
//  User shares reel link to this number → bot saves it
//  Stack: Node.js · Twilio WhatsApp · Supabase
// ============================================================

import express from "express";
import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: false }));

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const tw = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

const LINK_RE = /https?:\/\/[^\s]+/i;
const IG_RE   = /instagram\.com/i;

// In-memory session: { [phone]: { step, reelUrl } }
const sessions = {};

function phone(from) { return from.replace("whatsapp:", ""); }

async function reply(to, body) {
  return tw.messages.create({
    from: `whatsapp:${process.env.TWILIO_WA_NUMBER}`,
    to: `whatsapp:${to}`,
    body,
  });
}

async function saveReel({ userId, url, creator, note, reminder }) {
  const { error } = await sb.from("reels").insert({
    user_id: userId,
    url,
    creator: creator || null,
    note: note || null,
    reminder: reminder || null,
    status: "saved",
    created_at: new Date().toISOString(),
  });
  if (error) console.error("DB error:", error.message);
}

function parseCreatorFromUrl(url) {
  const m = url.match(/instagram\.com\/([a-zA-Z0-9._]+)\//);
  if (m && !["p","reel","reels","stories","tv","explore"].includes(m[1])) return m[1];
  return null;
}

function deadlineFromKeyword(text) {
  const t = text.toLowerCase().trim();
  const d = new Date();
  if (t.includes("today"))    { return d.toISOString().split("T")[0]; }
  if (t.includes("tomorrow")) { d.setDate(d.getDate()+1); return d.toISOString().split("T")[0]; }
  if (t.includes("week"))     { d.setDate(d.getDate()+7); return d.toISOString().split("T")[0]; }
  if (t.includes("month"))    { d.setMonth(d.getMonth()+1); return d.toISOString().split("T")[0]; }
  // Try to parse a date like "25 april" or "25/4"
  const dateMatch = text.match(/(\d{1,2})[\/\-\s](\w+)/);
  if (dateMatch) {
    const parsed = new Date(`${dateMatch[2]} ${dateMatch[1]} ${d.getFullYear()}`);
    if (!isNaN(parsed)) return parsed.toISOString().split("T")[0];
  }
  return null;
}

// ── Webhook ───────────────────────────────────────────────────
app.post("/bot", async (req, res) => {
  res.sendStatus(200); // ack Twilio immediately

  const from = req.body.From || "";
  const body = (req.body.Body || "").trim();
  const userId = phone(from);

  try {
    const session = sessions[userId] || { step: "idle" };
    const link = body.match(LINK_RE)?.[0];

    // ── Idle: waiting for a link ──────────────────────────────
    if (session.step === "idle" || !session.reelUrl) {
      if (!link) {
        await reply(from, "👋 Send me any reel link and I'll save it for you.");
        return;
      }

      sessions[userId] = { step: "ask_action", reelUrl: link };

      // If just saving quickly, give them an out
      await reply(from,
        "Got it ✓\n\n" +
        "Save only or set a reminder?\n\n" +
        "Reply:\n" +
        "1 — Just save\n" +
        "2 — Remind me (I'll ask when)\n" +
        "3 — Save with a note"
      );
      return;
    }

    // ── Awaiting action choice ────────────────────────────────
    if (session.step === "ask_action") {
      const choice = body.replace(/[^123]/g, "").trim();

      if (choice === "1") {
        const creator = parseCreatorFromUrl(session.reelUrl);
        await saveReel({ userId, url: session.reelUrl, creator });
        sessions[userId] = { step: "idle" };
        await reply(from, "Saved ✓\nOpen reely.app to view it.");
        return;
      }

      if (choice === "2") {
        sessions[userId] = { ...session, step: "ask_when" };
        await reply(from, "When should I remind you?\n\nReply: today / tomorrow / this week / this month / or a date like \"20 may\"");
        return;
      }

      if (choice === "3") {
        sessions[userId] = { ...session, step: "ask_note" };
        await reply(from, "Add a quick note about this reel:");
        return;
      }

      // Unrecognised
      await reply(from, "Reply 1, 2, or 3.");
      return;
    }

    // ── Awaiting reminder time ────────────────────────────────
    if (session.step === "ask_when") {
      const deadline = deadlineFromKeyword(body);
      const creator  = parseCreatorFromUrl(session.reelUrl);

      await saveReel({ userId, url: session.reelUrl, creator, reminder: deadline });
      sessions[userId] = { step: "idle" };

      await reply(from,
        deadline
          ? `Saved ✓ I'll remind you on ${deadline}.\nOpen reely.app to view it.`
          : `Saved ✓ (couldn't parse that date, no reminder set).\nOpen reely.app to edit.`
      );
      return;
    }

    // ── Awaiting note ─────────────────────────────────────────
    if (session.step === "ask_note") {
      const creator = parseCreatorFromUrl(session.reelUrl);
      await saveReel({ userId, url: session.reelUrl, creator, note: body });
      sessions[userId] = { step: "idle" };
      await reply(from, "Saved with your note ✓\nOpen reely.app to view it.");
      return;
    }

  } catch (err) {
    console.error("Bot error:", err);
    sessions[userId] = { step: "idle" };
    await reply(from, "Something went wrong. Send the link again.");
  }
});

// ── Health ────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ service: "Reely bot", ok: true }));

app.listen(process.env.PORT || 3000, () =>
  console.log(`Reely bot running on :${process.env.PORT || 3000}`)
);

// ============================================================
//  SUPABASE SCHEMA — run in SQL editor
// ============================================================
/*
create table reels (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  url        text not null,
  creator    text,
  note       text,
  reminder   date,
  status     text default 'saved' check (status in ('saved','done','skipped')),
  created_at timestamptz default now()
);

create index on reels(user_id);
create index on reels(reminder);
create index on reels(status);
*/

// ============================================================
//  .env
// ============================================================
/*
PORT=3000
TWILIO_SID=ACxxxxxxxxxx
TWILIO_TOKEN=xxxxxxxxxx
TWILIO_WA_NUMBER=+1415xxxxxxx
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
*/

// ============================================================
//  SETUP (10 minutes)
// ============================================================
/*
1. Twilio → Messaging → Try WhatsApp → Sandbox
   Set webhook: https://your-domain.com/bot (POST)

2. Supabase → New project → SQL editor → run schema above

3. Deploy to Railway:
   railway login && railway init && railway up
   Copy URL → paste into Twilio webhook

4. Save the Twilio WhatsApp sandbox number as "Reely" contact on your phone

5. On Instagram → Share any reel → WhatsApp → Reely → Send
   Done.
*/
