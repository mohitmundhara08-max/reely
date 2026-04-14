import { useState, useEffect, useRef, useCallback } from "react";

const G = "#22c55e";
const AMBER = "#f59e0b";
const BLUE = "#60a5fa";
const RED = "#f87171";
const PURPLE = "#a78bfa";

const CAT = {
  business: { color: AMBER, bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", icon: "◈", label: "Business" },
  content:  { color: PURPLE, bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.25)", icon: "◉", label: "Content" },
  health:   { color: G,    bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.25)",  icon: "◎", label: "Health" },
  learning: { color: BLUE, bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.25)", icon: "◇", label: "Learning" },
};

const COLS = [
  { id: "inbox",  label: "Inbox",  dot: "#555" },
  { id: "active", label: "Active", dot: AMBER },
  { id: "done",   label: "Done",   dot: G },
];

const INSTA = /https?:\/\/(www\.)?instagram\.com\/(reel|p|reels)\/[A-Za-z0-9_-]+\/?/i;

const AI_PROMPT = (url, mode) => `You are Reely — an execution engine that converts Instagram reel content into actionable outputs.

Reel URL: ${url}
Mode: ${mode}

Return ONLY a valid JSON object with NO markdown, no backticks, no explanation.

${mode === "summary" ? `{
  "summary": "max 2 sentences describing the reel content",
  "keyIdea": "single most important insight in 1 line",
  "category": "business|content|health|learning"
}` : mode === "actions" ? `{
  "summary": "max 2 sentences describing the reel content",
  "keyIdea": "single most important insight in 1 line",
  "steps": ["specific actionable step 1", "step 2", "step 3", "step 4", "step 5"],
  "category": "business|content|health|learning"
}` : `{
  "contentIdea": "1 specific content idea derived from this reel",
  "format": "reel|carousel|thread|blog",
  "hook": "opening line for the content",
  "steps": ["create point 1", "create point 2", "create point 3"],
  "category": "content"
}`}

Rules: Be specific to the topic. Make steps immediately doable. Infer from URL context. category must be exactly one of the four options.`;

async function callAI(url, mode) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: AI_PROMPT(url, mode) }],
    }),
  });
  const data = await res.json();
  const text = data.content?.[0]?.text ?? "{}";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function shortUrl(url) {
  return url.replace(/https?:\/\/(www\.)?instagram\.com\//, "ig.com/").slice(0, 32) + "…";
}

// ─── Card ────────────────────────────────────────────────────────────────────
function Card({ card, onMove, onDelete, onToggleStep }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CAT[card.category] || CAT.business;
  const steps = card.steps || [];
  const done = steps.filter((_, i) => card.checkedSteps?.[i]).length;
  const isFullyDone = steps.length > 0 && done === steps.length;

  return (
    <div
      style={{
        background: "#111",
        border: `1px solid ${expanded ? "#333" : "#1e1e1e"}`,
        borderRadius: 12,
        overflow: "hidden",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: expanded ? "0 8px 32px rgba(0,0,0,0.4)" : "none",
        cursor: "pointer",
        animation: "cardIn 0.3s ease forwards",
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Top bar */}
      <div style={{ padding: "12px 14px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 10, fontFamily: "monospace",
            background: cat.bg, color: cat.color,
            border: `1px solid ${cat.border}`,
            padding: "2px 8px", borderRadius: 20,
          }}>
            {cat.icon} {cat.label.toUpperCase()}
          </span>
          {card.mode && (
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "#555" }}>
              {card.mode === "actions" ? "⚡ Actions" : card.mode === "summary" ? "◉ Summary" : "✦ Content"}
            </span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 10, color: "#444", fontFamily: "monospace" }}>
            {timeAgo(card.createdAt)}
          </span>
        </div>

        {card.keyIdea && (
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e5e5e5", lineHeight: 1.4 }}>
            {card.keyIdea}
          </div>
        )}
        {card.contentIdea && (
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e5e5e5", lineHeight: 1.4 }}>
            {card.contentIdea}
          </div>
        )}

        {steps.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ flex: 1, height: 3, background: "#1e1e1e", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                width: `${(done / steps.length) * 100}%`, height: "100%",
                background: isFullyDone ? G : AMBER,
                borderRadius: 99, transition: "width 0.4s ease",
              }} />
            </div>
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "#555" }}>
              {done}/{steps.length}
            </span>
          </div>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div
          style={{ padding: "0 14px 14px" }}
          onClick={e => e.stopPropagation()}
        >
          {card.summary && (
            <div style={{
              fontSize: 12.5, color: "#888", lineHeight: 1.6,
              borderTop: "1px solid #1e1e1e", paddingTop: 12, marginBottom: 12,
            }}>
              {card.summary}
            </div>
          )}

          {card.hook && (
            <div style={{
              fontSize: 12.5, fontStyle: "italic", color: "#aaa",
              background: "rgba(167,139,250,0.06)", borderLeft: `2px solid ${PURPLE}`,
              padding: "8px 12px", borderRadius: "0 8px 8px 0", marginBottom: 12,
            }}>
              "{card.hook}"
            </div>
          )}

          {steps.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {steps.map((step, i) => {
                const checked = card.checkedSteps?.[i] || false;
                return (
                  <div
                    key={i}
                    style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}
                    onClick={() => onToggleStep(card.id, i)}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                      border: `1.5px solid ${checked ? G : "#333"}`,
                      background: checked ? G : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s", fontSize: 11, color: "#000",
                    }}>
                      {checked ? "✓" : ""}
                    </div>
                    <span style={{
                      fontSize: 12.5, lineHeight: 1.5, color: checked ? "#444" : "#ccc",
                      textDecoration: checked ? "line-through" : "none",
                      transition: "color 0.2s",
                    }}>{step}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* URL */}
          <div style={{
            fontSize: 10, fontFamily: "monospace", color: "#333",
            marginBottom: 12, wordBreak: "break-all",
          }}>
            {shortUrl(card.reelUrl)}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {COLS.filter(c => c.id !== card.status).map(col => (
              <button
                key={col.id}
                onClick={() => onMove(card.id, col.id)}
                style={{
                  fontSize: 11, fontFamily: "monospace",
                  padding: "4px 10px", borderRadius: 6,
                  border: `1px solid #2a2a2a`, background: "transparent",
                  color: col.dot, cursor: "pointer",
                }}
              >
                → {col.label}
              </button>
            ))}
            <button
              onClick={() => onDelete(card.id)}
              style={{
                fontSize: 11, fontFamily: "monospace",
                padding: "4px 10px", borderRadius: 6,
                border: `1px solid #2a2a2a`, background: "transparent",
                color: RED, cursor: "pointer", marginLeft: "auto",
              }}
            >
              ✕ Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Input Panel ─────────────────────────────────────────────────────────────
function InputPanel({ onAdd }) {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState("actions");
  const [state, setState] = useState("idle"); // idle | processing | error
  const [err, setErr] = useState("");
  const inputRef = useRef();

  const valid = INSTA.test(url);

  const submit = async () => {
    if (!valid || state === "processing") return;
    setState("processing");
    setErr("");
    try {
      const result = await callAI(url.match(INSTA)[0], mode);
      const card = {
        id: uid(),
        reelUrl: url.match(INSTA)[0],
        mode,
        status: "inbox",
        createdAt: Date.now(),
        category: result.category || "business",
        keyIdea: result.keyIdea || result.contentIdea || "",
        contentIdea: result.contentIdea || "",
        summary: result.summary || "",
        hook: result.hook || "",
        steps: result.steps || [],
        checkedSteps: {},
      };
      onAdd(card);
      setUrl("");
      setState("idle");
    } catch (e) {
      setErr("Processing failed. Check the URL and try again.");
      setState("error");
    }
  };

  return (
    <div style={{
      background: "#0d0d0d",
      border: "1px solid #1e1e1e",
      borderRadius: 14,
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            ref={inputRef}
            value={url}
            onChange={e => { setUrl(e.target.value); setState("idle"); setErr(""); }}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="Paste Instagram reel link…"
            style={{
              width: "100%", background: "#111",
              border: `1px solid ${valid ? "rgba(34,197,94,0.4)" : err ? "rgba(248,113,113,0.4)" : "#222"}`,
              borderRadius: 8, padding: "10px 14px",
              color: "#e5e5e5", fontSize: 13.5, fontFamily: "monospace",
              outline: "none", transition: "border-color 0.2s", boxSizing: "border-box",
            }}
          />
          {valid && (
            <span style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              fontSize: 12, color: G, fontFamily: "monospace",
            }}>✓</span>
          )}
        </div>
        <button
          onClick={submit}
          disabled={!valid || state === "processing"}
          style={{
            padding: "10px 18px",
            background: valid && state !== "processing" ? G : "#1a1a1a",
            color: valid && state !== "processing" ? "#000" : "#444",
            border: "none", borderRadius: 8, cursor: valid ? "pointer" : "default",
            fontWeight: 700, fontSize: 13, fontFamily: "monospace",
            transition: "all 0.2s", whiteSpace: "nowrap",
          }}
        >
          {state === "processing" ? "…" : "Process →"}
        </button>
      </div>

      {/* Mode selector */}
      <div style={{ display: "flex", gap: 6 }}>
        {[
          { id: "actions", label: "⚡ Action Steps" },
          { id: "summary", label: "◉ Summary" },
          { id: "content", label: "✦ Content Idea" },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 11.5, fontFamily: "monospace",
              border: `1px solid ${mode === m.id ? "rgba(34,197,94,0.4)" : "#222"}`,
              background: mode === m.id ? "rgba(34,197,94,0.08)" : "transparent",
              color: mode === m.id ? G : "#555", cursor: "pointer", transition: "all 0.2s",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {state === "processing" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#555", fontFamily: "monospace" }}>
          <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>◌</span>
          Processing reel with AI…
        </div>
      )}
      {err && <div style={{ fontSize: 12, color: RED, fontFamily: "monospace" }}>✕ {err}</div>}
    </div>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────
function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || "#e5e5e5", fontFamily: "monospace" }}>{value}</div>
      <div style={{ fontSize: 10, color: "#444", fontFamily: "monospace", marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function ReelyBoard() {
  const [cards, setCards] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loaded, setLoaded] = useState(false);

  // Load from storage
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("reely_cards");
        if (res?.value) setCards(JSON.parse(res.value));
      } catch (_) {}
      setLoaded(true);
    })();
  }, []);

  // Save to storage
  useEffect(() => {
    if (!loaded) return;
    window.storage.set("reely_cards", JSON.stringify(cards)).catch(() => {});
  }, [cards, loaded]);

  const addCard = useCallback((card) => {
    setCards(prev => [card, ...prev]);
  }, []);

  const moveCard = useCallback((id, status) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  }, []);

  const deleteCard = useCallback((id) => {
    setCards(prev => prev.filter(c => c.id !== id));
  }, []);

  const toggleStep = useCallback((cardId, stepIdx) => {
    setCards(prev => prev.map(c => {
      if (c.id !== cardId) return c;
      const checked = { ...c.checkedSteps, [stepIdx]: !c.checkedSteps?.[stepIdx] };
      const allDone = c.steps.length > 0 && c.steps.every((_, i) => checked[i]);
      return { ...c, checkedSteps: checked, status: allDone && c.status !== "done" ? "done" : c.status };
    }));
  }, []);

  const totalSteps = cards.reduce((a, c) => a + (c.steps?.length || 0), 0);
  const doneSteps = cards.reduce((a, c) => a + Object.values(c.checkedSteps || {}).filter(Boolean).length, 0);
  const doneCards = cards.filter(c => c.status === "done").length;

  const filterCats = ["all", ...Object.keys(CAT)];

  const filtered = filter === "all" ? cards : cards.filter(c => c.category === filter);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080808",
      color: "#e5e5e5",
      fontFamily: "'DM Sans', -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes cardIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; }
        input::placeholder { color: #333; }
        button { font-family: inherit; }
      `}</style>

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(8,8,8,0.95)", backdropFilter: "blur(10px)",
        borderBottom: "1px solid #111",
        padding: "0 24px",
        display: "flex", alignItems: "center", height: 52,
        gap: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: G, display: "flex", alignItems: "center",
            justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#000",
          }}>R</div>
          <span style={{ fontWeight: 800, fontSize: 16 }}>Reely</span>
          <span style={{
            fontSize: 9, fontFamily: "monospace",
            background: "rgba(34,197,94,0.1)", color: G,
            border: "1px solid rgba(34,197,94,0.2)",
            padding: "2px 6px", borderRadius: 20,
          }}>BOARD</span>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 24, marginLeft: "auto", alignItems: "center" }}>
          <Stat label="REELS" value={cards.length} />
          <Stat label="DONE" value={doneCards} color={G} />
          <Stat label="ACTIONS" value={`${doneSteps}/${totalSteps}`} color={AMBER} />
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>

        {/* Input */}
        <div style={{ marginBottom: 24 }}>
          <InputPanel onAdd={addCard} />
        </div>

        {/* Category filter */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {filterCats.map(f => {
            const c = f === "all" ? null : CAT[f];
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "5px 12px", borderRadius: 20, fontSize: 11, fontFamily: "monospace",
                  border: `1px solid ${active ? (c?.border || "rgba(34,197,94,0.4)") : "#1e1e1e"}`,
                  background: active ? (c?.bg || "rgba(34,197,94,0.08)") : "transparent",
                  color: active ? (c?.color || G) : "#444",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                {f === "all" ? "All" : `${c.icon} ${c.label}`}
                <span style={{ marginLeft: 5, opacity: 0.5 }}>
                  {f === "all" ? cards.length : cards.filter(x => x.category === f).length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Board — 3 columns */}
        {cards.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "80px 20px",
            color: "#222", fontFamily: "monospace",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>◎</div>
            <div style={{ fontSize: 14, marginBottom: 8 }}>Your board is empty.</div>
            <div style={{ fontSize: 12, color: "#1a1a1a" }}>Paste an Instagram reel link above to get started.</div>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 16,
            alignItems: "start",
          }}>
            {COLS.map(col => {
              const colCards = filtered.filter(c => c.status === col.id);
              return (
                <div key={col.id}>
                  {/* Column header */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    marginBottom: 12, padding: "0 2px",
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.dot }} />
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: "#555", fontWeight: 600, letterSpacing: 1 }}>
                      {col.label.toUpperCase()}
                    </span>
                    <span style={{
                      marginLeft: "auto",
                      fontSize: 11, fontFamily: "monospace",
                      color: "#333",
                    }}>{colCards.length}</span>
                  </div>

                  {/* Cards */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {colCards.map(card => (
                      <Card
                        key={card.id}
                        card={card}
                        onMove={moveCard}
                        onDelete={deleteCard}
                        onToggleStep={toggleStep}
                      />
                    ))}
                    {colCards.length === 0 && (
                      <div style={{
                        border: "1px dashed #1a1a1a", borderRadius: 12,
                        padding: "28px 16px", textAlign: "center",
                        fontSize: 11, fontFamily: "monospace", color: "#1e1e1e",
                      }}>
                        empty
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
