import { useState, useEffect, useRef, useCallback } from "react";

function uid() { return Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4); }

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function detectPlatform(url) {
  if (/instagram\.com/i.test(url)) return "instagram";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/facebook\.com|fb\.watch/i.test(url)) return "facebook";
  if (/tiktok\.com/i.test(url)) return "tiktok";
  if (/twitter\.com|x\.com/i.test(url)) return "twitter";
  return "link";
}

function deadlineStatus(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const now = new Date(); now.setHours(0,0,0,0);
  const diff = Math.round((d - now) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, type: "danger" };
  if (diff === 0) return { label: "Due today", type: "warning" };
  if (diff === 1) return { label: "Tomorrow", type: "info" };
  if (diff <= 7) return { label: `${diff}d left`, type: "normal" };
  return { label: d.toLocaleDateString("en-IN",{day:"numeric",month:"short"}), type: "normal" };
}

const CAT_COLORS = {
  music:"#9333ea", travel:"#2563eb", food:"#ea580c", fitness:"#16a34a",
  tech:"#0284c7", business:"#d97706", content:"#c026d3", learning:"#4f46e5",
  comedy:"#ca8a04", fashion:"#db2777", finance:"#15803d", cooking:"#ea580c",
  motivation:"#d97706", art:"#7c3aed", gaming:"#0e7490", health:"#16a34a",
};
function catColor(cat) {
  if (!cat) return "var(--color-text-tertiary)";
  const l = cat.toLowerCase();
  for (const [k,v] of Object.entries(CAT_COLORS)) if (l.includes(k)) return v;
  return "var(--color-text-secondary)";
}

const PLATFORM_META = {
  instagram:{ label:"IG", color:"#e1306c" },
  youtube:  { label:"YT", color:"#ff0000" },
  facebook: { label:"FB", color:"#1877f2" },
  tiktok:   { label:"TK", color:"#69c9d0" },
  twitter:  { label:"X",  color:"#1d9bf0" },
  link:     { label:"↗",  color:"var(--color-text-tertiary)" },
};

// ── AI helpers ────────────────────────────────────────────────────────────────
async function analyzeLink(url) {
  const platform = detectPlatform(url);
  const prompt = `A user saved a ${platform} link. Analyze it and return ONLY valid JSON (no markdown, no preamble):
{
  "topic": "2-3 sentences about what this content is likely about. Be specific using clues from the URL.",
  "category": "single lowercase word — choose the best fit: music, travel, food, fitness, tech, business, content, learning, comedy, fashion, finance, cooking, motivation, art, gaming, health, or another relevant word",
  "suggestedAction": "One specific actionable thing the user should DO — not vague. E.g. 'Try this recipe this weekend', 'Research visa requirements for this country', 'Apply to these companies'",
  "keyInsight": "The single most useful or interesting thing about this content in one line",
  "creator": "Creator or channel name if identifiable from the URL, else null"
}

URL: ${url}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514", max_tokens:1000,
      messages:[{role:"user",content:prompt}],
    }),
  });
  const data = await res.json();
  const text = data.content?.[0]?.text || "{}";
  return JSON.parse(text.replace(/```json|```/g,"").trim());
}

async function chatWithReel(reel, history, message) {
  const sys = `You help the user act on saved content. Be concise (under 120 words), specific, and practical.

Saved content:
URL: ${reel.url}
Topic: ${reel.analysis?.topic || "unknown"}
Category: ${reel.analysis?.category || "unknown"}
User's intent: ${reel.intent || "not set"}
Key insight: ${reel.analysis?.keyInsight || "unknown"}

Help them take action on this — find resources, make plans, answer questions. Always tie advice back to this specific content.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514", max_tokens:1000, system:sys,
      messages:[...history.map(m=>({role:m.role,content:m.content})),{role:"user",content:message}],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "Something went wrong.";
}

// ── Small UI atoms ────────────────────────────────────────────────────────────
function PlatBadge({ platform }) {
  const m = PLATFORM_META[platform] || PLATFORM_META.link;
  return (
    <span style={{
      fontSize:10, fontFamily:"var(--font-mono)", fontWeight:500,
      color: m.color, background:"var(--color-background-secondary)",
      border:"0.5px solid var(--color-border-tertiary)",
      padding:"2px 7px", borderRadius:20, flexShrink:0,
    }}>{m.label}</span>
  );
}

function CatBadge({ category }) {
  const c = catColor(category);
  return (
    <span style={{
      fontSize:10, fontFamily:"var(--font-mono)",
      color:c, background:`${c}18`, border:`0.5px solid ${c}44`,
      padding:"2px 8px", borderRadius:20, flexShrink:0,
    }}>{category}</span>
  );
}

function DlBadge({ dateStr }) {
  const ds = deadlineStatus(dateStr);
  if (!ds) return null;
  const colorMap = { danger:"var(--color-text-danger)", warning:"var(--color-text-warning)", info:"var(--color-text-info)", normal:"var(--color-text-tertiary)" };
  return <span style={{ fontSize:10, fontFamily:"var(--font-mono)", color:colorMap[ds.type] }}>{ds.label}</span>;
}

// ── Add Panel ─────────────────────────────────────────────────────────────────
function AddPanel({ onAdd }) {
  const [phase, setPhase] = useState("input"); // input | analyzing | confirm
  const [url, setUrl] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [intent, setIntent] = useState("");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  const valid = url.trim().startsWith("http");

  async function analyze() {
    if (!valid) return;
    setPhase("analyzing"); setErr("");
    try {
      const a = await analyzeLink(url.trim());
      setAnalysis(a);
      setIntent(a.suggestedAction || "");
      setPhase("confirm");
    } catch {
      setErr("Couldn't read this link. Paste the full URL and try again.");
      setPhase("input");
    }
  }

  function save() {
    onAdd({
      id: uid(),
      url: url.trim(),
      platform: detectPlatform(url),
      creator: analysis?.creator || null,
      analysis,
      intent: intent.trim(),
      deadline: deadline || null,
      note: note.trim(),
      status: "pending",
      createdAt: Date.now(),
      chat: [],
    });
    setPhase("input"); setUrl(""); setAnalysis(null);
    setIntent(""); setDeadline(""); setNote(""); setErr("");
  }

  return (
    <div style={{
      background:"var(--color-background-primary)",
      border:"0.5px solid var(--color-border-secondary)",
      borderRadius:"var(--border-radius-lg)",
      overflow:"hidden", marginBottom:20,
    }}>
      <div style={{ display:"flex", borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
        {["Paste link","Review & save"].map((s,i) => (
          <div key={i} style={{
            flex:1, padding:"9px 16px", fontSize:12, fontFamily:"var(--font-mono)",
            color: (i===0 && phase==="input") || (i===1 && (phase==="confirm"||phase==="analyzing"))
              ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
            borderBottom: (i===0&&phase==="input")||(i===1&&phase==="confirm")
              ? "2px solid var(--color-text-success)" : "2px solid transparent",
          }}>{i+1}. {s}</div>
        ))}
      </div>

      <div style={{ padding:"16px 18px", display:"flex", flexDirection:"column", gap:12 }}>
        {phase === "input" && <>
          <p style={{ fontSize:13, color:"var(--color-text-secondary)", lineHeight:1.55 }}>
            Any link — Instagram reel, YouTube video, tweet, article. AI will read it and tell you what it's about.
          </p>
          <div style={{ display:"flex", gap:8 }}>
            <input autoFocus value={url} onChange={e=>setUrl(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&analyze()}
              placeholder="https://www.instagram.com/reel/..." style={{flex:1}} />
            <button onClick={analyze} disabled={!valid}>Analyze →</button>
          </div>
          {err && <p style={{ fontSize:12, color:"var(--color-text-danger)" }}>{err}</p>}
        </>}

        {phase === "analyzing" && (
          <div style={{ padding:"20px 0", textAlign:"center" }}>
            <p style={{ fontSize:13, color:"var(--color-text-secondary)", fontFamily:"var(--font-mono)" }}>
              Reading the link…
            </p>
          </div>
        )}

        {phase === "confirm" && analysis && <>
          {/* AI analysis result */}
          <div style={{
            background:"var(--color-background-secondary)",
            borderRadius:"var(--border-radius-md)",
            padding:"12px 14px", display:"flex", flexDirection:"column", gap:8,
          }}>
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
              <PlatBadge platform={detectPlatform(url)} />
              {analysis.category && <CatBadge category={analysis.category} />}
              {analysis.creator && (
                <span style={{ fontSize:11, fontFamily:"var(--font-mono)", color:"var(--color-text-tertiary)" }}>
                  @{analysis.creator}
                </span>
              )}
            </div>
            <p style={{ fontSize:13, lineHeight:1.5, color:"var(--color-text-primary)" }}>
              {analysis.topic}
            </p>
            {analysis.keyInsight && (
              <p style={{ fontSize:12, color:"var(--color-text-secondary)", fontStyle:"italic" }}>
                "{analysis.keyInsight}"
              </p>
            )}
          </div>

          {/* Intent */}
          <div>
            <label style={{ fontSize:12, color:"var(--color-text-tertiary)", fontFamily:"var(--font-mono)", display:"block", marginBottom:5 }}>
              What do you want to do with this?
            </label>
            <input value={intent} onChange={e=>setIntent(e.target.value)}
              placeholder="Edit the AI suggestion or write your own…" />
          </div>

          {/* Deadline */}
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <label style={{ fontSize:12, fontFamily:"var(--font-mono)", color:"var(--color-text-tertiary)", whiteSpace:"nowrap" }}>
              By when?
            </label>
            <input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} style={{width:"auto"}} />
            {deadline && (
              <button onClick={()=>setDeadline("")} style={{border:"none",background:"none",cursor:"pointer",color:"var(--color-text-tertiary)",padding:0}}>✕</button>
            )}
            <span style={{ fontSize:11, fontFamily:"var(--font-mono)", color:"var(--color-text-tertiary)" }}>optional</span>
          </div>

          {/* Note */}
          <textarea value={note} onChange={e=>setNote(e.target.value)}
            placeholder="Why did you save this? (optional)" rows={2}
            style={{ resize:"none" }} />

          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>{setPhase("input");setAnalysis(null);}}>← Back</button>
            <button onClick={save} style={{ flex:1 }}>Save to Reely</button>
          </div>
        </>}
      </div>
    </div>
  );
}

// ── AI Chat per reel ──────────────────────────────────────────────────────────
function ChatPanel({ reel, onUpdateChat }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef();

  async function send() {
    if (!input.trim() || busy) return;
    const msg = input.trim(); setInput(""); setBusy(true);
    const userMsg = { role:"user", content:msg, ts:Date.now() };
    const next = [...reel.chat, userMsg];
    onUpdateChat(reel.id, next);
    const reply = await chatWithReel(reel, next, msg);
    onUpdateChat(reel.id, [...next, { role:"assistant", content:reply, ts:Date.now() }]);
    setBusy(false);
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [reel.chat, busy]);

  const starters = ["What can I actually do with this?","Find resources on this topic","Help me make an action plan","What should I know before starting?"];

  return (
    <div style={{ borderTop:"0.5px solid var(--color-border-tertiary)", padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>
      <p style={{ fontSize:11, fontFamily:"var(--font-mono)", color:"var(--color-text-tertiary)" }}>Ask AI about this</p>

      {reel.chat.length === 0 && (
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {starters.map(q => (
            <button key={q} onClick={()=>setInput(q)} style={{ fontSize:11 }}>{q}</button>
          ))}
        </div>
      )}

      {reel.chat.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:220, overflowY:"auto" }}>
          {reel.chat.map((m,i) => (
            <div key={i} style={{
              fontSize:12.5, lineHeight:1.55, padding:"8px 12px",
              borderRadius:"var(--border-radius-md)",
              color: m.role==="user" ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              background: m.role==="user" ? "var(--color-background-tertiary)" : "var(--color-background-secondary)",
              alignSelf: m.role==="user" ? "flex-end" : "flex-start",
              maxWidth:"88%",
            }}>{m.content}</div>
          ))}
          {busy && <p style={{ fontSize:12, fontFamily:"var(--font-mono)", color:"var(--color-text-tertiary)" }}>thinking…</p>}
          <div ref={bottomRef} />
        </div>
      )}

      <div style={{ display:"flex", gap:8 }}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&send()}
          placeholder="Ask anything about this…" style={{ flex:1 }} />
        <button onClick={send} disabled={busy||!input.trim()}>→</button>
      </div>
    </div>
  );
}

// ── Reel Card ─────────────────────────────────────────────────────────────────
function ReelCard({ reel, onStatus, onDelete, onUpdateChat }) {
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState(false);

  return (
    <div style={{
      background:"var(--color-background-primary)",
      border:"0.5px solid var(--color-border-tertiary)",
      borderRadius:"var(--border-radius-lg)",
      overflow:"hidden",
      opacity: reel.status==="done" ? 0.55 : 1,
      transition:"opacity 0.2s",
    }}>
      {/* Header row — always visible */}
      <div onClick={()=>setOpen(!open)} style={{ padding:"12px 14px", cursor:"pointer", display:"flex", flexDirection:"column", gap:7 }}>
        <div style={{ display:"flex", gap:7, alignItems:"center", flexWrap:"wrap" }}>
          <PlatBadge platform={reel.platform} />
          {reel.analysis?.category && <CatBadge category={reel.analysis.category} />}
          {reel.creator && (
            <span style={{ fontSize:11, fontFamily:"var(--font-mono)", color:"var(--color-text-tertiary)" }}>
              @{reel.creator}
            </span>
          )}
          <span style={{ marginLeft:"auto", fontSize:11, fontFamily:"var(--font-mono)", color:"var(--color-text-tertiary)" }}>
            {timeAgo(reel.createdAt)}
          </span>
        </div>

        {reel.analysis?.topic && (
          <p style={{
            fontSize:13, lineHeight:1.45, color:"var(--color-text-primary)",
            textDecoration: reel.status==="done" ? "line-through" : "none",
          }}>{reel.analysis.topic}</p>
        )}

        {reel.intent && (
          <p style={{ fontSize:12, color:"var(--color-text-secondary)", lineHeight:1.4 }}>
            → {reel.intent}
          </p>
        )}

        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <DlBadge dateStr={reel.deadline} />
          <span style={{ marginLeft:"auto", fontSize:11, fontFamily:"var(--font-mono)",
            color: reel.status==="done" ? "var(--color-text-success)" : reel.status==="skipped" ? "var(--color-text-danger)" : "var(--color-text-tertiary)" }}>
            {reel.status==="done"?"✓ done":reel.status==="skipped"?"✕ skipped":"○ pending"}
          </span>
          <span style={{ fontSize:10, color:"var(--color-text-tertiary)" }}>{open?"▲":"▼"}</span>
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div style={{ borderTop:"0.5px solid var(--color-border-tertiary)" }}>
          <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>
            {reel.analysis?.keyInsight && (
              <p style={{
                fontSize:12.5, color:"var(--color-text-secondary)", fontStyle:"italic",
                lineHeight:1.5, borderLeft:"2px solid var(--color-border-secondary)",
                paddingLeft:10, borderRadius:0,
              }}>{reel.analysis.keyInsight}</p>
            )}
            {reel.note && (
              <p style={{ fontSize:12.5, color:"var(--color-text-secondary)", lineHeight:1.5 }}>
                {reel.note}
              </p>
            )}
            <a href={reel.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize:11, fontFamily:"var(--font-mono)", color:"var(--color-text-info)", wordBreak:"break-all" }}>
              ↗ {reel.url.slice(0,64)}{reel.url.length>64?"…":""}
            </a>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", paddingTop:2 }}>
              {reel.status!=="done" && <button onClick={()=>onStatus(reel.id,"done")}>✓ Done</button>}
              {reel.status!=="pending" && <button onClick={()=>onStatus(reel.id,"pending")}>↺ Reset</button>}
              {reel.status!=="skipped" && <button onClick={()=>onStatus(reel.id,"skipped")}>✕ Skip</button>}
              <button onClick={()=>setChat(!chat)} style={{
                background: chat ? "var(--color-background-info)" : undefined,
                color: chat ? "var(--color-text-info)" : undefined,
              }}>
                {chat ? "Close AI" : "Ask AI ↗"}
              </button>
              <button onClick={()=>onDelete(reel.id)} style={{ marginLeft:"auto", color:"var(--color-text-danger)", borderColor:"var(--color-border-danger)" }}>
                Delete
              </button>
            </div>
          </div>
          {chat && <ChatPanel reel={reel} onUpdateChat={onUpdateChat} />}
        </div>
      )}
    </div>
  );
}

// ── Views ─────────────────────────────────────────────────────────────────────
function TodayView({ reels, ...props }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const overdue  = reels.filter(r=>r.status==="pending"&&r.deadline&&new Date(r.deadline)<today);
  const dueToday = reels.filter(r=>{
    if(!r.deadline||r.status!=="pending") return false;
    const d=new Date(r.deadline); d.setHours(0,0,0,0);
    return d.getTime()===today.getTime();
  });
  const addedToday = reels.filter(r=>{
    const d=new Date(r.createdAt); d.setHours(0,0,0,0);
    return d.getTime()===today.getTime();
  });

  if (overdue.length+dueToday.length+addedToday.length===0) return (
    <div style={{ textAlign:"center", padding:"60px 20px" }}>
      <p style={{ fontSize:14, color:"var(--color-text-tertiary)" }}>Nothing for today — you're clear.</p>
    </div>
  );

  const Section = ({label,items,color}) => items.length===0 ? null : (
    <div style={{ marginBottom:24 }}>
      <p style={{ fontSize:11, fontFamily:"var(--font-mono)", color: color||"var(--color-text-tertiary)", letterSpacing:0.5, marginBottom:10 }}>
        {label} — {items.length}
      </p>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {items.map(r=><ReelCard key={r.id} reel={r} {...props}/>)}
      </div>
    </div>
  );

  return <>
    <Section label="Overdue" items={overdue} color="var(--color-text-danger)" />
    <Section label="Due today" items={dueToday} color="var(--color-text-warning)" />
    <Section label="Saved today" items={addedToday} />
  </>;
}

function AllView({ reels, ...props }) {
  const [catFilter, setCat] = useState("all");
  const [stFilter, setSt] = useState("pending");

  const cats = [...new Set(reels.map(r=>r.analysis?.category).filter(Boolean))];
  const filtered = reels
    .filter(r=>(catFilter==="all"||r.analysis?.category===catFilter)&&(stFilter==="all"||r.status===stFilter))
    .sort((a,b)=>{
      const da=a.deadline?new Date(a.deadline):null, db=b.deadline?new Date(b.deadline):null;
      if(da&&!db) return -1; if(!da&&db) return 1;
      if(da&&db) return da-db;
      return b.createdAt-a.createdAt;
    });

  return <>
    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16, alignItems:"center" }}>
      <div style={{ display:"flex", gap:5, flexWrap:"wrap", flex:1 }}>
        {["all",...cats].map(c=>(
          <button key={c} onClick={()=>setCat(c)} style={{
            fontSize:11, fontFamily:"var(--font-mono)",
            color: catFilter===c ? (c==="all"?"var(--color-text-success)":catColor(c)) : "var(--color-text-tertiary)",
            borderColor: catFilter===c ? (c==="all"?"var(--color-border-success)":catColor(c)+"55") : undefined,
            background: catFilter===c ? (c==="all"?"var(--color-background-success)":catColor(c)+"11") : undefined,
          }}>{c==="all"?"All":c} <span style={{opacity:0.4}}>{c==="all"?reels.length:reels.filter(r=>r.analysis?.category===c).length}</span></button>
        ))}
      </div>
      <div style={{ display:"flex", gap:5 }}>
        {["pending","done","all"].map(s=>(
          <button key={s} onClick={()=>setSt(s)} style={{
            fontSize:11, fontFamily:"var(--font-mono)",
            color: stFilter===s?"var(--color-text-primary)":"var(--color-text-tertiary)",
          }}>{s}</button>
        ))}
      </div>
    </div>
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {filtered.length===0
        ? <p style={{ textAlign:"center", padding:"40px 0", color:"var(--color-text-tertiary)", fontSize:13 }}>No reels match</p>
        : filtered.map(r=><ReelCard key={r.id} reel={r} {...props}/>)
      }
    </div>
  </>;
}

function CreatorsView({ reels, ...props }) {
  const groups = {};
  reels.forEach(r=>{ const k=r.creator||"__none"; if(!groups[k])groups[k]=[]; groups[k].push(r); });
  const sorted = Object.entries(groups).filter(([k])=>k!=="__none").sort((a,b)=>b[1].length-a[1].length);
  const none = groups["__none"]||[];

  if(sorted.length===0&&none.length===0) return (
    <div style={{ textAlign:"center", padding:"60px 0" }}>
      <p style={{ fontSize:13, color:"var(--color-text-tertiary)" }}>No creators yet. Add @handles when saving reels.</p>
    </div>
  );

  const CreatorGroup = ({creator,items}) => {
    const done=items.filter(r=>r.status==="done").length;
    const cats=[...new Set(items.map(r=>r.analysis?.category).filter(Boolean))];
    return (
      <div style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-lg)", overflow:"hidden" }}>
        <div style={{ padding:"12px 16px", borderBottom:"0.5px solid var(--color-border-tertiary)", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{
            width:36, height:36, borderRadius:"50%",
            background:"var(--color-background-info)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:14, fontWeight:500, color:"var(--color-text-info)", flexShrink:0,
          }}>{creator[0].toUpperCase()}</div>
          <div>
            <p style={{ fontSize:14, fontWeight:500, color:"var(--color-text-primary)", margin:0 }}>@{creator}</p>
            <p style={{ fontSize:11, fontFamily:"var(--font-mono)", color:"var(--color-text-tertiary)", margin:0 }}>
              {items.length} saved · {done} done
            </p>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", gap:5, flexWrap:"wrap", justifyContent:"flex-end" }}>
            {cats.slice(0,3).map(c=><CatBadge key={c} category={c}/>)}
          </div>
        </div>
        <div style={{ padding:"10px 12px", display:"flex", flexDirection:"column", gap:8 }}>
          {items.map(r=><ReelCard key={r.id} reel={r} {...props}/>)}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {sorted.map(([c,items])=><CreatorGroup key={c} creator={c} items={items}/>)}
      {none.length>0 && (
        <div>
          <p style={{ fontSize:11, fontFamily:"var(--font-mono)", color:"var(--color-text-tertiary)", marginBottom:10 }}>No creator tagged — {none.length}</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {none.map(r=><ReelCard key={r.id} reel={r} {...props}/>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function ReelyApp() {
  const [reels, setReels]   = useState([]);
  const [view, setView]     = useState("today");
  const [showAdd, setAdd]   = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(()=>{
    (async()=>{
      try { const r=await window.storage.get("reely_v3"); if(r?.value) setReels(JSON.parse(r.value)); }
      catch(_){}
      setLoaded(true);
    })();
  },[]);

  useEffect(()=>{
    if(!loaded) return;
    window.storage.set("reely_v3",JSON.stringify(reels)).catch(()=>{});
  },[reels,loaded]);

  const addReel    = useCallback(r=>{ setReels(p=>[r,...p]); setAdd(false); },[]);
  const setStatus  = useCallback((id,s)=>setReels(p=>p.map(r=>r.id===id?{...r,status:s}:r)),[]);
  const deleteReel = useCallback(id=>setReels(p=>p.filter(r=>r.id!==id)),[]);
  const updateChat = useCallback((id,chat)=>setReels(p=>p.map(r=>r.id===id?{...r,chat}:r)),[]);

  const today = new Date(); today.setHours(0,0,0,0);
  const pending  = reels.filter(r=>r.status==="pending").length;
  const done     = reels.filter(r=>r.status==="done").length;
  const overdue  = reels.filter(r=>r.deadline&&r.status==="pending"&&new Date(r.deadline)<today).length;

  return (
    <div style={{ fontFamily:"var(--font-sans)" }}>
      {/* Sticky header */}
      <div style={{
        position:"sticky", top:0, zIndex:50,
        background:"var(--color-background-primary)",
        borderBottom:"0.5px solid var(--color-border-tertiary)",
        padding:"0 20px", display:"flex", alignItems:"center", gap:12, height:52,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{
            width:26, height:26, borderRadius:"var(--border-radius-md)",
            background:"var(--color-background-success)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:13, fontWeight:500, color:"var(--color-text-success)",
          }}>R</div>
          <span style={{ fontWeight:500, fontSize:15, color:"var(--color-text-primary)" }}>Reely</span>
        </div>

        <div style={{ display:"flex", gap:6 }}>
          {[
            {v:reels.length, l:"saved"},
            {v:pending, l:"pending"},
            {v:done, l:"done"},
            ...(overdue>0?[{v:overdue, l:"overdue", danger:true}]:[]),
          ].map((s,i)=>(
            <span key={i} style={{
              fontSize:11, fontFamily:"var(--font-mono)",
              color: s.danger?"var(--color-text-danger)":"var(--color-text-secondary)",
              background:"var(--color-background-secondary)",
              padding:"3px 8px", borderRadius:20,
              border:"0.5px solid var(--color-border-tertiary)",
            }}>{s.v} {s.l}</span>
          ))}
        </div>

        <button onClick={()=>setAdd(!showAdd)} style={{ marginLeft:"auto", fontSize:13 }}>
          {showAdd ? "✕ cancel" : "+ save reel"}
        </button>
      </div>

      <div style={{ maxWidth:720, margin:"0 auto", padding:"20px 20px 60px" }}>
        {showAdd && <AddPanel onAdd={addReel} />}

        {/* View tabs */}
        <div style={{ display:"flex", gap:0, marginBottom:20, borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
          {[{id:"today",l:"Today"},{id:"all",l:"All reels"},{id:"creators",l:"By creator"}].map(t=>(
            <button key={t.id} onClick={()=>setView(t.id)} style={{
              padding:"8px 16px", border:"none", background:"transparent",
              color: view===t.id?"var(--color-text-primary)":"var(--color-text-tertiary)",
              fontWeight: view===t.id?500:400, fontSize:13,
              borderBottom: view===t.id?"2px solid var(--color-text-primary)":"2px solid transparent",
              marginBottom:-1,
            }}>{t.l}</button>
          ))}
        </div>

        {/* Empty state */}
        {reels.length===0&&!showAdd && (
          <div style={{ textAlign:"center", padding:"80px 20px" }}>
            <p style={{ fontSize:32, color:"var(--color-text-tertiary)", marginBottom:16, fontWeight:200 }}>○</p>
            <p style={{ fontSize:15, color:"var(--color-text-secondary)", marginBottom:8 }}>Nothing saved yet.</p>
            <p style={{ fontSize:13, color:"var(--color-text-tertiary)", lineHeight:1.7, marginBottom:24, maxWidth:380, margin:"0 auto 24px" }}>
              Paste any link — Instagram reel, YouTube video, article.<br/>
              AI reads it, you set the intent. Done.
            </p>
            <button onClick={()=>setAdd(true)}>+ Save your first reel</button>
          </div>
        )}

        {reels.length>0&&view==="today" && <TodayView reels={reels} onStatus={setStatus} onDelete={deleteReel} onUpdateChat={updateChat}/>}
        {reels.length>0&&view==="all"   && <AllView   reels={reels} onStatus={setStatus} onDelete={deleteReel} onUpdateChat={updateChat}/>}
        {view==="creators"              && <CreatorsView reels={reels} onStatus={setStatus} onDelete={deleteReel} onUpdateChat={updateChat}/>}
      </div>
    </div>
  );
}
