import { useState, useEffect, useRef, useCallback } from "react";

// ─── utils ────────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fmtDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date(); now.setHours(0,0,0,0);
  d.setHours(0,0,0,0);
  const diff = Math.round((d - now) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, warn: true };
  if (diff === 0) return { label: "Today", warn: false };
  if (diff === 1) return { label: "Tomorrow", warn: false };
  return { label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), warn: false };
}

function platform(url = "") {
  if (/instagram\.com/i.test(url)) return "IG";
  if (/youtube\.com|youtu\.be/i.test(url)) return "YT";
  if (/tiktok\.com/i.test(url)) return "TK";
  if (/twitter\.com|x\.com/i.test(url)) return "X";
  return "↗";
}

function shortUrl(url = "") {
  return url.replace(/https?:\/\/(www\.)?/, "").slice(0, 40) + (url.length > 40 ? "…" : "");
}

// ─── AI deep dive ─────────────────────────────────────────────────────────────
async function callAI(messages, system) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system,
      messages,
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text ?? "Something went wrong.";
}

const AI_SYSTEM = (reel) => `You are helping the user act on a saved reel/video.

Saved content:
- URL: ${reel.url}
- Creator: ${reel.creator ? "@" + reel.creator : "unknown"}
- Platform: ${platform(reel.url)}
- User's note: ${reel.note || "none"}
- Saved: ${timeAgo(reel.createdAt)}

Be direct and specific. Under 150 words unless asked to go deeper. When suggesting actions, make them concrete and immediately doable. Format with short lines, not walls of text.`;

const QUICK_ACTIONS = [
  { id: "summarise", label: "Summarise it", prompt: "Summarise what this reel is likely about based on the URL and context. Be specific." },
  { id: "todo",      label: "Make a to-do",  prompt: "Turn this into 3-5 specific, actionable to-do items I can actually complete." },
  { id: "content",   label: "Content ideas", prompt: "What content ideas can I create inspired by this? Give me 3 specific angles." },
  { id: "research",  label: "Deep research", prompt: "What should I research or learn more about from this? Give me specific search queries and topics." },
  { id: "music",     label: "Music / audio", prompt: "If there's music in this reel, how can I find it? What are common tools to identify and use audio from short-form content?" },
  { id: "ask",       label: "Ask anything",  prompt: null },
];

// ─── AI Panel ─────────────────────────────────────────────────────────────────
function AIPanel({ reel, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [customAsk, setCustomAsk] = useState(false);
  const bottomRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function send(prompt) {
    if (!prompt?.trim() || busy) return;
    setBusy(true);
    const userMsg = { role: "user", content: prompt };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    const reply = await callAI(next, AI_SYSTEM(reel));
    setMessages([...next, { role: "assistant", content: reply }]);
    setBusy(false);
  }

  return (
    <div style={{
      borderTop: "0.5px solid var(--color-border-tertiary)",
      background: "var(--color-background-tertiary)",
      padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-text-tertiary)" }}>
          AI deep dive — @{reel.creator || "unknown"}
        </span>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 13, color: "var(--color-text-tertiary)", padding: "2px 6px",
        }}>✕</button>
      </div>

      {/* Quick action buttons */}
      {messages.length === 0 && !customAsk && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {QUICK_ACTIONS.map(a => (
            <button key={a.id} onClick={() => a.id === "ask" ? setCustomAsk(true) : send(a.prompt)}
              style={{
                fontSize: 11, padding: "5px 11px",
                border: "0.5px solid var(--color-border-secondary)",
                borderRadius: "var(--border-radius-md)",
                background: "var(--color-background-primary)",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
              }}>{a.label}</button>
          ))}
        </div>
      )}

      {/* Chat thread */}
      {messages.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto" }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              fontSize: 13, lineHeight: 1.6, padding: "9px 12px",
              borderRadius: "var(--border-radius-md)",
              background: m.role === "user" ? "var(--color-background-secondary)" : "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              color: "var(--color-text-primary)",
              whiteSpace: "pre-wrap",
            }}>{m.content}</div>
          ))}
          {busy && (
            <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--color-text-tertiary)", padding: "4px 0" }}>
              thinking…
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      {(messages.length > 0 || customAsk) && (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send(input)}
            placeholder="Ask anything about this reel…"
            style={{ flex: 1, fontSize: 13 }}
          />
          <button onClick={() => send(input)} disabled={busy || !input.trim()}>→</button>
        </div>
      )}
    </div>
  );
}

// ─── Reel Card ─────────────────────────────────────────────────────────────────
function ReelCard({ reel, onStatus, onDelete }) {
  const [open, setOpen] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const dl = fmtDate(reel.reminder);
  const plat = platform(reel.url);

  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)",
      overflow: "hidden",
      opacity: reel.status === "done" ? 0.5 : 1,
      transition: "opacity 0.2s",
    }}>
      {/* Main row */}
      <div onClick={() => { setOpen(!open); if (!open) setShowAI(false); }}
        style={{ padding: "11px 14px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 }}>

        {/* Row 1: platform + creator + time */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 500,
            background: "var(--color-background-secondary)",
            border: "0.5px solid var(--color-border-tertiary)",
            padding: "2px 7px", borderRadius: 20,
            color: "var(--color-text-secondary)",
          }}>{plat}</span>

          {reel.creator && (
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
              @{reel.creator}
            </span>
          )}

          <span style={{ marginLeft: "auto", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-text-tertiary)" }}>
            {timeAgo(reel.createdAt)}
          </span>
        </div>

        {/* URL */}
        <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--color-text-tertiary)" }}>
          {shortUrl(reel.url)}
        </div>

        {/* Note */}
        {reel.note && (
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            {reel.note}
          </div>
        )}

        {/* Row bottom: reminder + status */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {dl && (
            <span style={{
              fontSize: 11, fontFamily: "var(--font-mono)",
              color: dl.warn ? "var(--color-text-danger)" : "var(--color-text-warning)",
            }}>◷ {dl.label}</span>
          )}
          <span style={{
            marginLeft: "auto", fontSize: 11, fontFamily: "var(--font-mono)",
            color: reel.status === "done" ? "var(--color-text-success)"
              : reel.status === "skipped" ? "var(--color-text-danger)"
              : "var(--color-text-tertiary)",
          }}>
            {reel.status === "done" ? "✓ done" : reel.status === "skipped" ? "✕ skipped" : "○ saved"}
          </span>
          <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            <a href={reel.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-text-info)", wordBreak: "break-all" }}
              onClick={e => e.stopPropagation()}>
              ↗ Open reel
            </a>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {reel.status !== "done" && (
                <button onClick={() => onStatus(reel.id, "done")} style={{ fontSize: 12 }}>✓ Done</button>
              )}
              {reel.status !== "saved" && (
                <button onClick={() => onStatus(reel.id, "saved")} style={{ fontSize: 12 }}>↺ Reset</button>
              )}
              {reel.status !== "skipped" && (
                <button onClick={() => onStatus(reel.id, "skipped")} style={{ fontSize: 12 }}>✕ Skip</button>
              )}
              <button
                onClick={() => setShowAI(!showAI)}
                style={{
                  fontSize: 12,
                  background: showAI ? "var(--color-background-info)" : undefined,
                  color: showAI ? "var(--color-text-info)" : undefined,
                  borderColor: showAI ? "var(--color-border-info)" : undefined,
                }}>
                {showAI ? "Close AI" : "✦ AI deep dive"}
              </button>
              <button onClick={() => onDelete(reel.id)}
                style={{ fontSize: 12, marginLeft: "auto", color: "var(--color-text-danger)", borderColor: "var(--color-border-danger)" }}>
                Delete
              </button>
            </div>
          </div>
          {showAI && <AIPanel reel={reel} onClose={() => setShowAI(false)} />}
        </div>
      )}
    </div>
  );
}

// ─── Add reel modal ────────────────────────────────────────────────────────────
function AddPanel({ onAdd, onClose }) {
  const [url, setUrl] = useState("");
  const [creator, setCreator] = useState("");
  const [note, setNote] = useState("");
  const [reminder, setReminder] = useState("");
  const [mode, setMode] = useState("save"); // save | remind

  const valid = url.trim().startsWith("http");

  function save() {
    if (!valid) return;
    // Try to extract creator from URL if not provided
    let autoCreator = creator.trim().replace("@", "");
    if (!autoCreator) {
      const m = url.match(/instagram\.com\/([a-zA-Z0-9._]+)\//);
      if (m && !["p", "reel", "reels", "stories", "tv", "explore"].includes(m[1])) {
        autoCreator = m[1];
      }
    }
    onAdd({
      id: uid(),
      url: url.trim(),
      creator: autoCreator || "",
      note: note.trim(),
      reminder: mode === "remind" ? reminder : null,
      status: "saved",
      createdAt: Date.now(),
    });
  }

  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-secondary)",
      borderRadius: "var(--border-radius-lg)",
      padding: "16px 18px",
      marginBottom: 16,
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>Save a reel</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 14 }}>✕</button>
      </div>

      <input
        autoFocus
        value={url}
        onChange={e => setUrl(e.target.value)}
        onKeyDown={e => e.key === "Enter" && save()}
        placeholder="Paste reel link…"
        style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}
      />

      <input
        value={creator}
        onChange={e => setCreator(e.target.value)}
        placeholder="@creator handle (optional)"
        style={{ fontSize: 13 }}
      />

      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Why did you save this? (optional)"
        rows={2}
        style={{ resize: "none", fontSize: 13 }}
      />

      {/* Save or Remind */}
      <div style={{ display: "flex", gap: 6 }}>
        {["save", "remind"].map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            fontSize: 12,
            background: mode === m ? "var(--color-background-success)" : undefined,
            color: mode === m ? "var(--color-text-success)" : undefined,
            borderColor: mode === m ? "var(--color-border-success)" : undefined,
          }}>
            {m === "save" ? "Just save" : "Remind me"}
          </button>
        ))}
      </div>

      {mode === "remind" && (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "var(--color-text-tertiary)", whiteSpace: "nowrap", fontFamily: "var(--font-mono)" }}>When?</label>
          <input type="date" value={reminder} onChange={e => setReminder(e.target.value)}
            style={{ fontSize: 12, colorScheme: "light dark" }} />
        </div>
      )}

      <button onClick={save} disabled={!valid} style={{ fontSize: 13 }}>
        Save to Reely
      </button>
    </div>
  );
}

// ─── All reels view ────────────────────────────────────────────────────────────
function AllView({ reels, onStatus, onDelete }) {
  const [status, setStatus] = useState("all");
  const filtered = reels.filter(r => status === "all" || r.status === status)
    .sort((a, b) => {
      // overdue first, then by reminder, then by createdAt
      const da = a.reminder ? new Date(a.reminder) : null;
      const db = b.reminder ? new Date(b.reminder) : null;
      if (da && !db) return -1;
      if (!da && db) return 1;
      if (da && db) return da - db;
      return b.createdAt - a.createdAt;
    });

  return (
    <>
      <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
        {["all", "saved", "done", "skipped"].map(s => (
          <button key={s} onClick={() => setStatus(s)} style={{
            fontSize: 11, fontFamily: "var(--font-mono)",
            background: status === s ? "var(--color-background-secondary)" : "transparent",
            color: status === s ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
            fontWeight: status === s ? 500 : 400,
          }}>
            {s} <span style={{ opacity: 0.5 }}>{s === "all" ? reels.length : reels.filter(r => r.status === s).length}</span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0
          ? <p style={{ color: "var(--color-text-tertiary)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>Nothing here</p>
          : filtered.map(r => <ReelCard key={r.id} reel={r} onStatus={onStatus} onDelete={onDelete} />)
        }
      </div>
    </>
  );
}

// ─── By creator view ──────────────────────────────────────────────────────────
function CreatorView({ reels, onStatus, onDelete }) {
  const groups = {};
  reels.forEach(r => {
    const k = r.creator || "__none";
    if (!groups[k]) groups[k] = [];
    groups[k].push(r);
  });

  const sorted = Object.entries(groups)
    .filter(([k]) => k !== "__none")
    .sort((a, b) => b[1].length - a[1].length);
  const none = groups["__none"] || [];

  if (sorted.length === 0 && none.length === 0) return (
    <p style={{ color: "var(--color-text-tertiary)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>
      No creators yet. Add @handle when saving.
    </p>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {sorted.map(([creator, items]) => {
        const done = items.filter(r => r.status === "done").length;
        return (
          <div key={creator} style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)", overflow: "hidden",
          }}>
            <div style={{
              padding: "12px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "var(--color-background-info)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 500, color: "var(--color-text-info)", flexShrink: 0,
              }}>
                {creator[0].toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
                  @{creator}
                </p>
                <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-text-tertiary)", margin: 0 }}>
                  {items.length} saved · {done} done
                </p>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <span style={{
                  fontSize: 11, fontFamily: "var(--font-mono)",
                  color: "var(--color-text-tertiary)",
                  background: "var(--color-background-secondary)",
                  padding: "3px 8px", borderRadius: 20,
                  border: "0.5px solid var(--color-border-tertiary)",
                }}>
                  {Math.round((done / items.length) * 100)}% done
                </span>
              </div>
            </div>
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map(r => <ReelCard key={r.id} reel={r} onStatus={onStatus} onDelete={onDelete} />)}
            </div>
          </div>
        );
      })}

      {none.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-text-tertiary)", marginBottom: 10 }}>
            No creator tagged — {none.length}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {none.map(r => <ReelCard key={r.id} reel={r} onStatus={onStatus} onDelete={onDelete} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reminders view ───────────────────────────────────────────────────────────
function RemindersView({ reels, onStatus, onDelete }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const overdue = reels.filter(r => r.reminder && r.status === "saved" && new Date(r.reminder) < today);
  const upcoming = reels.filter(r => {
    if (!r.reminder || r.status !== "saved") return false;
    const d = new Date(r.reminder); d.setHours(0, 0, 0, 0);
    return d >= today;
  }).sort((a, b) => new Date(a.reminder) - new Date(b.reminder));

  if (overdue.length + upcoming.length === 0) return (
    <p style={{ color: "var(--color-text-tertiary)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>
      No reminders set. When saving a reel, choose "Remind me."
    </p>
  );

  const Section = ({ label, items, color }) => items.length === 0 ? null : (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: color || "var(--color-text-tertiary)", marginBottom: 10, letterSpacing: 0.5 }}>
        {label} — {items.length}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(r => <ReelCard key={r.id} reel={r} onStatus={onStatus} onDelete={onDelete} />)}
      </div>
    </div>
  );

  return (
    <>
      <Section label="OVERDUE" items={overdue} color="var(--color-text-danger)" />
      <Section label="UPCOMING" items={upcoming} />
    </>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────
export default function ReelyApp() {
  const [reels, setReels]   = useState([]);
  const [view, setView]     = useState("all");
  const [showAdd, setAdd]   = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("reely_final");
        if (res?.value) setReels(JSON.parse(res.value));
      } catch (_) {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.storage.set("reely_final", JSON.stringify(reels)).catch(() => {});
  }, [reels, loaded]);

  const addReel   = useCallback(r => { setReels(p => [r, ...p]); setAdd(false); }, []);
  const setStatus = useCallback((id, s) => setReels(p => p.map(r => r.id === id ? { ...r, status: s } : r)), []);
  const delReel   = useCallback(id => setReels(p => p.filter(r => r.id !== id)), []);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const pending  = reels.filter(r => r.status === "saved").length;
  const done     = reels.filter(r => r.status === "done").length;
  const overdue  = reels.filter(r => r.reminder && r.status === "saved" && new Date(r.reminder) < today).length;
  const creators = new Set(reels.map(r => r.creator).filter(Boolean)).size;

  const VIEWS = [
    { id: "all",      label: "All reels" },
    { id: "creators", label: "By creator" },
    { id: "reminders",label: "Reminders" },
  ];

  return (
    <div style={{ fontFamily: "var(--font-sans)", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--color-background-primary)",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        padding: "0 20px",
        display: "flex", alignItems: "center", gap: 14, height: 52,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "var(--border-radius-md)",
            background: "var(--color-background-success)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 500, color: "var(--color-text-success)",
          }}>R</div>
          <span style={{ fontWeight: 500, fontSize: 15, color: "var(--color-text-primary)" }}>Reely</span>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { v: reels.length, l: "saved" },
            { v: pending, l: "pending" },
            { v: done, l: "done" },
            ...(overdue > 0 ? [{ v: overdue, l: "overdue", danger: true }] : []),
            ...(creators > 0 ? [{ v: creators, l: "creators" }] : []),
          ].map((s, i) => (
            <span key={i} style={{
              fontSize: 11, fontFamily: "var(--font-mono)",
              color: s.danger ? "var(--color-text-danger)" : "var(--color-text-secondary)",
              background: "var(--color-background-secondary)",
              padding: "3px 8px", borderRadius: 20,
              border: s.danger ? "0.5px solid var(--color-border-danger)" : "0.5px solid var(--color-border-tertiary)",
            }}>{s.v} {s.l}</span>
          ))}
        </div>

        <button onClick={() => setAdd(!showAdd)} style={{ marginLeft: "auto", fontSize: 13 }}>
          {showAdd ? "✕ cancel" : "+ save reel"}
        </button>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 20px 60px" }}>

        {/* Add panel */}
        {showAdd && <AddPanel onAdd={addReel} onClose={() => setAdd(false)} />}

        {/* WhatsApp banner — shown only when no reels */}
        {reels.length === 0 && !showAdd && (
          <div style={{
            background: "var(--color-background-secondary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)",
            padding: "16px 18px", marginBottom: 20,
          }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 6 }}>
              Save reels via WhatsApp
            </p>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.65 }}>
              Share any Instagram reel to the Reely WhatsApp number. Bot asks one question. Reel appears here automatically. Until the bot is live, use "+ save reel" above.
            </p>
          </div>
        )}

        {/* View tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 18, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          {VIEWS.map(t => (
            <button key={t.id} onClick={() => setView(t.id)} style={{
              padding: "8px 16px", border: "none", background: "transparent",
              color: view === t.id ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
              fontWeight: view === t.id ? 500 : 400, fontSize: 13, cursor: "pointer",
              borderBottom: view === t.id ? "2px solid var(--color-text-primary)" : "2px solid transparent",
              marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>

        {/* Empty state */}
        {reels.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 28, color: "var(--color-text-tertiary)", marginBottom: 12, fontWeight: 200 }}>○</p>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 6 }}>No reels yet.</p>
            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", lineHeight: 1.65, marginBottom: 20 }}>
              Share any reel here. Save it with or without a reminder.<br />
              Later — open AI deep dive on any reel to transcript, research, make a to-do, extract music, anything.
            </p>
            <button onClick={() => setAdd(true)} style={{ fontSize: 13 }}>+ Save your first reel</button>
          </div>
        )}

        {reels.length > 0 && view === "all"      && <AllView      reels={reels} onStatus={setStatus} onDelete={delReel} />}
        {reels.length > 0 && view === "creators"  && <CreatorView  reels={reels} onStatus={setStatus} onDelete={delReel} />}
        {view === "reminders"                     && <RemindersView reels={reels} onStatus={setStatus} onDelete={delReel} />}
      </div>
    </div>
  );
}
