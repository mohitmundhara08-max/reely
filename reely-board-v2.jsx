import { useState, useEffect, useRef, useCallback } from "react";

const ACTION_TYPES = [
  { id: "travel",   icon: "✈", label: "Travel",   color: "#60a5fa" },
  { id: "business", icon: "◈", label: "Business",  color: "#f59e0b" },
  { id: "content",  icon: "◉", label: "Content",   color: "#a78bfa" },
  { id: "health",   icon: "◎", label: "Health",    color: "#34d399" },
  { id: "activity", icon: "◆", label: "Activity",  color: "#fb923c" },
  { id: "learning", icon: "◇", label: "Learning",  color: "#38bdf8" },
  { id: "thinking", icon: "◐", label: "Thinking",  color: "#e879f9" },
  { id: "fun",      icon: "◑", label: "Fun / Meme",color: "#facc15" },
  { id: "save",     icon: "◻", label: "Just Save", color: "#555" },
];

const INSTA = /https?:\/\/(www\.)?instagram\.com\/(reel|p|reels)\/([A-Za-z0-9_-]+)\/?/i;

function parseCreator(url) {
  // Try to extract from URL patterns like /reel/CODE/ — no username in reel URLs
  // So we ask user, but pre-fill with "unknown"
  return "";
}

function parseReelId(url) {
  const m = url.match(INSTA);
  return m ? m[3] : "";
}

function uid() { return Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4); }

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function deadlineLabel(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((d - now) / 86400000);
  if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, color: "#f87171" };
  if (diff === 0) return { text: "Due today", color: "#fb923c" };
  if (diff === 1) return { text: "Due tomorrow", color: "#facc15" };
  if (diff <= 7) return { text: `Due in ${diff}d`, color: "#a3e635" };
  return { text: `Due ${d.toLocaleDateString("en-IN", { day:"numeric", month:"short" })}`, color: "#555" };
}

function getActionType(id) {
  return ACTION_TYPES.find(a => a.id === id) || ACTION_TYPES[ACTION_TYPES.length-1];
}

// ─── Add Reel Panel ────────────────────────────────────────────────────────
function AddPanel({ onAdd }) {
  const [step, setStep] = useState(0); // 0=url, 1=intent
  const [url, setUrl]   = useState("");
  const [creator, setCreator] = useState("");
  const [actionId, setActionId] = useState("");
  const [note, setNote] = useState("");
  const [deadline, setDeadline] = useState("");
  const [customAction, setCustomAction] = useState("");

  const validUrl = INSTA.test(url);

  function handleUrlNext() {
    if (!validUrl) return;
    setStep(1);
  }

  function handleSave() {
    const at = getActionType(actionId || "save");
    const card = {
      id: uid(),
      reelUrl: url.trim(),
      reelId: parseReelId(url),
      creator: creator.trim().replace("@","").toLowerCase() || "unknown",
      actionId: actionId || "save",
      actionLabel: customAction || at.label,
      note: note.trim(),
      deadline: deadline || null,
      status: "pending",
      createdAt: Date.now(),
      doneAt: null,
    };
    onAdd(card);
    setStep(0); setUrl(""); setCreator(""); setActionId(""); setNote(""); setDeadline(""); setCustomAction("");
  }

  return (
    <div style={{
      background: "#0d0d0d", border: "1px solid #1e1e1e",
      borderRadius: 14, overflow: "hidden",
    }}>
      {/* Step indicator */}
      <div style={{ display:"flex", borderBottom:"1px solid #111" }}>
        {["Reel link", "What to do"].map((s, i) => (
          <div key={i} style={{
            flex: 1, padding: "10px 16px", fontSize: 11, fontFamily: "monospace",
            color: step === i ? "#e5e5e5" : "#333",
            borderBottom: step === i ? "2px solid #22c55e" : "2px solid transparent",
            transition: "all 0.2s",
          }}>{i+1}. {s}</div>
        ))}
      </div>

      <div style={{ padding: "16px 18px", display:"flex", flexDirection:"column", gap:12 }}>
        {step === 0 && <>
          <div style={{ fontSize: 12, color: "#444", fontFamily: "monospace" }}>
            Paste the Instagram reel link
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <input
              autoFocus
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleUrlNext()}
              placeholder="https://www.instagram.com/reel/..."
              style={{
                flex: 1, background:"#111",
                border: `1px solid ${validUrl ? "rgba(34,197,94,0.4)" : "#222"}`,
                borderRadius: 8, padding: "10px 14px",
                color: "#e5e5e5", fontSize: 13, fontFamily: "monospace",
                outline: "none",
              }}
            />
            <button
              onClick={handleUrlNext}
              disabled={!validUrl}
              style={{
                padding:"10px 18px", borderRadius:8, border:"none",
                background: validUrl ? "#22c55e" : "#1a1a1a",
                color: validUrl ? "#000" : "#333",
                fontWeight: 700, fontSize:13, cursor: validUrl ? "pointer" : "default",
                transition:"all 0.2s", whiteSpace:"nowrap",
              }}
            >Next →</button>
          </div>
          <input
            value={creator}
            onChange={e => setCreator(e.target.value)}
            placeholder="Creator handle (e.g. @chef.nikhil) — optional"
            style={{
              background:"#111", border:"1px solid #1a1a1a", borderRadius:8,
              padding:"8px 14px", color:"#e5e5e5", fontSize:12.5,
              fontFamily:"monospace", outline:"none",
            }}
          />
        </>}

        {step === 1 && <>
          <div style={{ fontSize: 12, color: "#444", fontFamily: "monospace" }}>
            What do you want to do with this reel?
          </div>

          {/* Action grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
            {ACTION_TYPES.map(a => (
              <button
                key={a.id}
                onClick={() => setActionId(a.id)}
                style={{
                  padding:"10px 8px", borderRadius:8, border:`1px solid ${actionId===a.id ? a.color+"88" : "#1e1e1e"}`,
                  background: actionId===a.id ? a.color+"15" : "transparent",
                  color: actionId===a.id ? a.color : "#444",
                  cursor:"pointer", fontSize:12, fontFamily:"monospace",
                  transition:"all 0.15s", textAlign:"center",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                }}
              >
                <span style={{ fontSize:18 }}>{a.icon}</span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>

          {/* Custom action label */}
          {actionId && actionId !== "save" && (
            <input
              value={customAction}
              onChange={e => setCustomAction(e.target.value)}
              placeholder={`Describe the action… (e.g. "Try this recipe on Sunday")`}
              style={{
                background:"#111", border:"1px solid #1a1a1a", borderRadius:8,
                padding:"9px 14px", color:"#e5e5e5", fontSize:12.5,
                fontFamily:"monospace", outline:"none",
              }}
            />
          )}

          {/* Deadline */}
          {actionId && actionId !== "save" && (
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <label style={{ fontSize:11, color:"#444", fontFamily:"monospace", whiteSpace:"nowrap" }}>
                By when?
              </label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                style={{
                  background:"#111", border:"1px solid #1a1a1a", borderRadius:8,
                  padding:"7px 12px", color: deadline ? "#e5e5e5" : "#333",
                  fontSize:12, fontFamily:"monospace", outline:"none", cursor:"pointer",
                  colorScheme:"dark",
                }}
              />
              {deadline && (
                <button onClick={() => setDeadline("")} style={{
                  background:"none", border:"none", color:"#444", cursor:"pointer", fontSize:14,
                }}>✕</button>
              )}
            </div>
          )}

          {/* Note */}
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Any note about why you saved this…"
            rows={2}
            style={{
              background:"#111", border:"1px solid #1a1a1a", borderRadius:8,
              padding:"9px 14px", color:"#e5e5e5", fontSize:12.5,
              fontFamily:"monospace", outline:"none", resize:"none",
            }}
          />

          <div style={{ display:"flex", gap:8 }}>
            <button
              onClick={() => setStep(0)}
              style={{
                padding:"9px 16px", borderRadius:8, border:"1px solid #222",
                background:"transparent", color:"#555", cursor:"pointer", fontSize:12,
              }}
            >← Back</button>
            <button
              onClick={handleSave}
              disabled={!actionId}
              style={{
                flex:1, padding:"10px", borderRadius:8, border:"none",
                background: actionId ? "#22c55e" : "#1a1a1a",
                color: actionId ? "#000" : "#333",
                fontWeight:700, fontSize:13, cursor: actionId ? "pointer" : "default",
                transition:"all 0.2s",
              }}
            >Save to board</button>
          </div>
        </>}
      </div>
    </div>
  );
}

// ─── Reel Card ─────────────────────────────────────────────────────────────
function ReelCard({ card, onStatus, onDelete }) {
  const [open, setOpen] = useState(false);
  const at = getActionType(card.actionId);
  const dl = deadlineLabel(card.deadline);

  return (
    <div
      style={{
        background: card.status === "done" ? "#0d0d0d" : "#111",
        border: `1px solid ${open ? "#2a2a2a" : "#171717"}`,
        borderRadius: 11, overflow:"hidden",
        opacity: card.status === "done" ? 0.55 : 1,
        transition: "all 0.2s",
        cursor: "pointer",
        animation: "cardIn 0.25s ease forwards",
      }}
      onClick={() => setOpen(!open)}
    >
      <div style={{ padding:"11px 13px", display:"flex", flexDirection:"column", gap:7 }}>
        {/* Row 1: action type + creator + time */}
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <span style={{
            fontSize:10, fontFamily:"monospace",
            color: at.color, background: at.color+"14",
            border:`1px solid ${at.color}33`,
            padding:"2px 8px", borderRadius:20,
          }}>{at.icon} {card.actionLabel || at.label}</span>
          {card.creator && card.creator !== "unknown" && (
            <span style={{ fontSize:10, color:"#444", fontFamily:"monospace" }}>@{card.creator}</span>
          )}
          <span style={{ marginLeft:"auto", fontSize:10, color:"#2e2e2e", fontFamily:"monospace" }}>
            {timeAgo(card.createdAt)}
          </span>
        </div>

        {/* Note */}
        {card.note && (
          <div style={{ fontSize:12.5, color: card.status==="done" ? "#444":"#bbb", lineHeight:1.45 }}>
            {card.note}
          </div>
        )}

        {/* Row 2: deadline + status */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {dl && (
            <span style={{ fontSize:10, fontFamily:"monospace", color: dl.color }}>
              ◷ {dl.text}
            </span>
          )}
          <span style={{
            marginLeft: dl ? "auto" : 0,
            fontSize:10, fontFamily:"monospace",
            color: card.status==="done" ? "#22c55e" : card.status==="skipped" ? "#f87171" : "#333",
          }}>
            {card.status === "done" ? "✓ Done" : card.status === "skipped" ? "✕ Skipped" : "○ Pending"}
          </span>
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ borderTop:"1px solid #171717", padding:"10px 13px", display:"flex", flexDirection:"column", gap:8 }}
          onClick={e => e.stopPropagation()}>
          {/* URL */}
          <a
            href={card.reelUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize:10, fontFamily:"monospace", color:"#333", wordBreak:"break-all" }}
            onClick={e => e.stopPropagation()}
          >
            ↗ {card.reelUrl.replace("https://","").slice(0,48)}…
          </a>

          {/* Actions */}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {card.status !== "done" && (
              <button onClick={() => onStatus(card.id, "done")} style={btnStyle("#22c55e")}>✓ Mark done</button>
            )}
            {card.status !== "pending" && (
              <button onClick={() => onStatus(card.id, "pending")} style={btnStyle("#555")}>↺ Reset</button>
            )}
            {card.status !== "skipped" && (
              <button onClick={() => onStatus(card.id, "skipped")} style={btnStyle("#f87171")}>✕ Skip</button>
            )}
            <button
              onClick={() => onDelete(card.id)}
              style={{ ...btnStyle("#f87171"), marginLeft:"auto", borderColor:"#2a1a1a" }}
            >Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

function btnStyle(color) {
  return {
    padding:"4px 12px", borderRadius:6, fontSize:11, fontFamily:"monospace",
    border:`1px solid ${color}33`, background:"transparent",
    color: color, cursor:"pointer",
  };
}

// ─── Creator View ───────────────────────────────────────────────────────────
function CreatorView({ cards, onStatus, onDelete }) {
  const groups = {};
  cards.forEach(c => {
    const key = c.creator || "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });
  const sorted = Object.entries(groups).sort((a,b) => b[1].length - a[1].length);

  if (sorted.length === 0) return (
    <div style={{ textAlign:"center", padding:"60px 20px", color:"#222", fontFamily:"monospace", fontSize:13 }}>
      No creators yet
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {sorted.map(([creator, creatorCards]) => {
        const done = creatorCards.filter(c => c.status === "done").length;
        return (
          <div key={creator} style={{ background:"#0d0d0d", border:"1px solid #171717", borderRadius:12, overflow:"hidden" }}>
            <div style={{
              padding:"12px 16px", display:"flex", alignItems:"center", gap:12,
              borderBottom: "1px solid #111",
            }}>
              <div style={{
                width:36, height:36, borderRadius:"50%",
                background:"#1a1a1a", display:"flex", alignItems:"center",
                justifyContent:"center", fontFamily:"monospace", fontWeight:700, fontSize:14, color:"#555",
              }}>
                {creator === "unknown" ? "?" : creator[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#e5e5e5" }}>
                  {creator === "unknown" ? "Unknown creator" : `@${creator}`}
                </div>
                <div style={{ fontSize:11, color:"#333", fontFamily:"monospace" }}>
                  {creatorCards.length} reel{creatorCards.length!==1?"s":""} saved · {done} done
                </div>
              </div>
              {/* Category breakdown */}
              <div style={{ marginLeft:"auto", display:"flex", gap:4, flexWrap:"wrap", justifyContent:"flex-end" }}>
                {Object.entries(
                  creatorCards.reduce((acc, c) => { acc[c.actionId]=(acc[c.actionId]||0)+1; return acc; }, {})
                ).map(([aid, count]) => {
                  const at = getActionType(aid);
                  return (
                    <span key={aid} style={{
                      fontSize:10, fontFamily:"monospace",
                      color: at.color, background: at.color+"14",
                      border:`1px solid ${at.color}33`,
                      padding:"2px 7px", borderRadius:20,
                    }}>{at.icon} {count}</span>
                  );
                })}
              </div>
            </div>
            <div style={{ padding:"10px 12px", display:"flex", flexDirection:"column", gap:8 }}>
              {creatorCards.map(card => (
                <ReelCard key={card.id} card={card} onStatus={onStatus} onDelete={onDelete} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Timeline View ─────────────────────────────────────────────────────────
function TimelineView({ cards, onStatus, onDelete }) {
  const withDL = cards.filter(c => c.deadline && c.status === "pending")
    .sort((a,b) => new Date(a.deadline) - new Date(b.deadline));
  const noDL = cards.filter(c => !c.deadline && c.status === "pending");

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {withDL.length > 0 && <>
        <div style={{ fontSize:11, fontFamily:"monospace", color:"#444", letterSpacing:1 }}>
          UPCOMING DEADLINES — {withDL.length}
        </div>
        {withDL.map(card => {
          const dl = deadlineLabel(card.deadline);
          return (
            <div key={card.id} style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
              <div style={{
                width:52, flexShrink:0, textAlign:"center", paddingTop:2,
              }}>
                <div style={{ fontSize:10, fontFamily:"monospace", color: dl?.color || "#555" }}>
                  {dl?.text}
                </div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <ReelCard card={card} onStatus={onStatus} onDelete={onDelete} />
              </div>
            </div>
          );
        })}
      </>}
      {noDL.length > 0 && <>
        <div style={{ fontSize:11, fontFamily:"monospace", color:"#333", letterSpacing:1, marginTop:8 }}>
          NO DEADLINE — {noDL.length}
        </div>
        {noDL.map(card => (
          <ReelCard key={card.id} card={card} onStatus={onStatus} onDelete={onDelete} />
        ))}
      </>}
      {withDL.length === 0 && noDL.length === 0 && (
        <div style={{ textAlign:"center", padding:"60px 20px", color:"#222", fontFamily:"monospace", fontSize:13 }}>
          No pending reels
        </div>
      )}
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────────────────
export default function ReelyBoard() {
  const [cards, setCards]     = useState([]);
  const [view, setView]       = useState("board"); // board | creator | timeline
  const [filterAction, setFilterAction] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loaded, setLoaded]   = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("reely_v2");
        if (res?.value) setCards(JSON.parse(res.value));
      } catch(_) {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.storage.set("reely_v2", JSON.stringify(cards)).catch(() => {});
  }, [cards, loaded]);

  const addCard    = useCallback(c => { setCards(p => [c, ...p]); setShowAdd(false); }, []);
  const setStatus  = useCallback((id, status) => setCards(p => p.map(c => c.id===id ? {...c, status, doneAt: status==="done"?Date.now():c.doneAt} : c)), []);
  const deleteCard = useCallback(id => setCards(p => p.filter(c => c.id!==id)), []);

  // Filtered cards
  const filtered = cards.filter(c => {
    const matchAction = filterAction === "all" || c.actionId === filterAction;
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchAction && matchStatus;
  });

  // Stats
  const pending  = cards.filter(c => c.status === "pending").length;
  const done     = cards.filter(c => c.status === "done").length;
  const overdue  = cards.filter(c => c.deadline && c.status === "pending" && new Date(c.deadline) < new Date()).length;
  const creators = new Set(cards.map(c => c.creator).filter(c => c && c !== "unknown")).size;

  return (
    <div style={{
      minHeight:"100vh", background:"#080808", color:"#e5e5e5",
      fontFamily:"'DM Sans',-apple-system,sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes cardIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:#1e1e1e; border-radius:3px; }
        input,textarea { font-family:inherit; }
        input::placeholder,textarea::placeholder { color:#2e2e2e; }
        button { font-family:inherit; }
      `}</style>

      {/* Header */}
      <div style={{
        position:"sticky", top:0, zIndex:50,
        background:"rgba(8,8,8,0.96)", backdropFilter:"blur(10px)",
        borderBottom:"1px solid #111",
        padding:"0 20px",
        display:"flex", alignItems:"center", gap:16, height:54,
      }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{
            width:28, height:28, borderRadius:8, background:"#22c55e",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:800, fontSize:14, color:"#000",
          }}>R</div>
          <span style={{ fontWeight:800, fontSize:15 }}>Reely</span>
        </div>

        {/* Stat pills */}
        <div style={{ display:"flex", gap:8, marginLeft:8 }}>
          {[
            { v: cards.length, l: "saved",   c: "#555" },
            { v: pending,      l: "pending",  c: "#f59e0b" },
            { v: done,         l: "done",     c: "#22c55e" },
            ...(overdue > 0 ? [{ v: overdue, l: "overdue", c: "#f87171" }] : []),
            { v: creators,     l: "creators", c: "#60a5fa" },
          ].map((s, i) => (
            <div key={i} style={{
              fontSize:11, fontFamily:"monospace",
              background:"#111", border:"1px solid #1a1a1a",
              padding:"3px 10px", borderRadius:20,
              display:"flex", gap:5, alignItems:"center",
            }}>
              <span style={{ fontWeight:700, color: s.c }}>{s.v}</span>
              <span style={{ color:"#333" }}>{s.l}</span>
            </div>
          ))}
        </div>

        {/* Add button */}
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            marginLeft:"auto",
            padding:"7px 16px", borderRadius:8, border:"none",
            background: showAdd ? "#1a1a1a" : "#22c55e",
            color: showAdd ? "#555" : "#000",
            fontWeight:700, fontSize:13, cursor:"pointer",
            transition:"all 0.2s",
          }}
        >{showAdd ? "✕ Cancel" : "+ Add reel"}</button>
      </div>

      <div style={{ maxWidth:860, margin:"0 auto", padding:"20px 20px 60px" }}>

        {/* Add panel */}
        {showAdd && (
          <div style={{ marginBottom:20, animation:"cardIn 0.2s ease" }}>
            <AddPanel onAdd={addCard} />
          </div>
        )}

        {/* View tabs */}
        <div style={{ display:"flex", gap:0, marginBottom:20, background:"#0d0d0d", border:"1px solid #171717", borderRadius:10, overflow:"hidden", width:"fit-content" }}>
          {[
            { id:"board",    label:"Board" },
            { id:"creator",  label:"By Creator" },
            { id:"timeline", label:"Timeline" },
          ].map(t => (
            <button key={t.id} onClick={() => setView(t.id)} style={{
              padding:"8px 18px", border:"none",
              background: view===t.id ? "#1a1a1a" : "transparent",
              color: view===t.id ? "#e5e5e5" : "#444",
              cursor:"pointer", fontSize:12.5, fontWeight: view===t.id ? 600 : 400,
              transition:"all 0.15s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* Filters (board view only) */}
        {view === "board" && (
          <div style={{ display:"flex", gap:16, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
            {/* Action type filter */}
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              <button
                onClick={() => setFilterAction("all")}
                style={filterChipStyle(filterAction==="all", "#22c55e")}
              >All</button>
              {ACTION_TYPES.map(a => (
                <button key={a.id}
                  onClick={() => setFilterAction(filterAction===a.id ? "all" : a.id)}
                  style={filterChipStyle(filterAction===a.id, a.color)}
                >
                  {a.icon} {a.label}
                  <span style={{ marginLeft:4, opacity:0.4 }}>
                    {cards.filter(c=>c.actionId===a.id).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div style={{ display:"flex", gap:5, marginLeft:"auto" }}>
              {["all","pending","done","skipped"].map(s => (
                <button key={s}
                  onClick={() => setFilterStatus(filterStatus===s ? "all" : s)}
                  style={filterChipStyle(filterStatus===s, s==="done" ? "#22c55e" : s==="skipped" ? "#f87171" : s==="pending" ? "#f59e0b" : "#555")}
                >
                  {s==="all"?"All":s[0].toUpperCase()+s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {cards.length === 0 && !showAdd && (
          <div style={{
            textAlign:"center", padding:"100px 20px",
            color:"#1e1e1e",
          }}>
            <div style={{ fontSize:52, marginBottom:20, opacity:0.4 }}>◎</div>
            <div style={{ fontSize:15, fontFamily:"monospace", color:"#2a2a2a", marginBottom:8 }}>
              Nothing saved yet.
            </div>
            <div style={{ fontSize:12, color:"#1a1a1a", fontFamily:"monospace" }}>
              Paste a reel link to get started.
            </div>
            <button
              onClick={() => setShowAdd(true)}
              style={{
                marginTop:24, padding:"10px 24px", borderRadius:8, border:"none",
                background:"#22c55e", color:"#000", fontWeight:700, fontSize:13, cursor:"pointer",
              }}
            >+ Add your first reel</button>
          </div>
        )}

        {/* Board view — group by action type */}
        {view === "board" && cards.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
            {(filterAction === "all" ? ACTION_TYPES : ACTION_TYPES.filter(a=>a.id===filterAction)).map(at => {
              const group = filtered.filter(c => c.actionId === at.id);
              if (group.length === 0) return null;
              return (
                <div key={at.id}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <span style={{ fontSize:12, fontFamily:"monospace", color: at.color }}>
                      {at.icon} {at.label.toUpperCase()}
                    </span>
                    <div style={{ flex:1, height:"1px", background:"#111" }} />
                    <span style={{ fontSize:11, fontFamily:"monospace", color:"#2a2a2a" }}>{group.length}</span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {group.map(card => (
                      <ReelCard key={card.id} card={card} onStatus={setStatus} onDelete={deleteCard} />
                    ))}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ textAlign:"center", padding:"40px 20px", color:"#222", fontFamily:"monospace", fontSize:12 }}>
                No reels match this filter
              </div>
            )}
          </div>
        )}

        {view === "creator" && (
          <CreatorView cards={filtered} onStatus={setStatus} onDelete={deleteCard} />
        )}

        {view === "timeline" && (
          <TimelineView cards={filtered} onStatus={setStatus} onDelete={deleteCard} />
        )}
      </div>
    </div>
  );
}

function filterChipStyle(active, color) {
  return {
    padding:"4px 11px", borderRadius:20, fontSize:11, fontFamily:"monospace",
    border:`1px solid ${active ? color+"55" : "#1a1a1a"}`,
    background: active ? color+"12" : "transparent",
    color: active ? color : "#333",
    cursor:"pointer", transition:"all 0.15s",
  };
}
