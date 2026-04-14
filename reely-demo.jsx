import { useState, useEffect, useRef } from "react";

const COLORS = {
  bg: "#0a0a0a",
  surface: "#111111",
  surfaceLight: "#1a1a1a",
  border: "#222222",
  green: "#25D366",
  greenDark: "#128C7E",
  amber: "#F59E0B",
  amberLight: "#FCD34D",
  text: "#F5F5F5",
  textMuted: "#888888",
  textDim: "#555555",
  bubble: "#1f2c34",
  bubbleUser: "#005c4b",
  red: "#EF4444",
  blue: "#3B82F6",
  purple: "#8B5CF6",
};

const style = (obj) => obj;

const DEMO_FLOW = [
  { from: "user", text: "https://www.instagram.com/reel/Cxyz123abc/", delay: 600 },
  {
    from: "bot",
    text: "🎬 Got it! I'm processing this reel...\n\nWhat do you want from this?",
    menu: ["1️⃣ Summary", "2️⃣ Action Steps", "3️⃣ Content Idea"],
    delay: 1400,
  },
  { from: "user", text: "2", delay: 1000 },
  {
    from: "bot",
    isResult: true,
    text: "",
    result: {
      summary: "Founder shares how he went from 0 to 10K MRR by cold DMing 500 founders in 30 days.",
      keyIdea: "Outbound volume beats inbound waiting at early stage.",
      steps: [
        "List 50 ideal customers today using Apollo or LinkedIn.",
        "Write 1 personalised DM template — reference their work.",
        "Send 20 DMs/day for the next 7 days.",
        "Track replies in a simple sheet (Name / Replied / Booked).",
        "Follow up once after 48hrs with a value-add, not a pitch.",
      ],
      category: "business",
    },
    delay: 2200,
  },
  {
    from: "bot",
    text: "What do you want to do with this?",
    menu: ["💾 Save it", "✅ Add to tasks", "⏰ Set reminder"],
    delay: 800,
  },
  { from: "user", text: "✅ Add to tasks", delay: 900 },
  {
    from: "bot",
    text: "✅ Done! Added 5 tasks to your Reely board.\n\nI'll nudge you tomorrow if you haven't started 👊",
    delay: 1000,
  },
];

const categoryColors = {
  business: { bg: "#1a1500", text: "#F59E0B", label: "💼 Business" },
  content: { bg: "#150a1f", text: "#8B5CF6", label: "✏️ Content" },
  health: { bg: "#0a1a0a", text: "#22C55E", label: "💪 Health" },
  learning: { bg: "#0a0f1f", text: "#3B82F6", label: "📚 Learning" },
};

function ChatBubble({ msg, visible }) {
  const isUser = msg.from === "user";

  if (!visible) return null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 12,
        animation: "fadeSlideIn 0.35s ease forwards",
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.green}, ${COLORS.greenDark})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            marginRight: 8,
            flexShrink: 0,
            marginTop: 4,
          }}
        >
          R
        </div>
      )}
      <div style={{ maxWidth: "78%" }}>
        {msg.isResult ? (
          <ResultCard result={msg.result} />
        ) : (
          <div
            style={{
              background: isUser ? COLORS.bubbleUser : COLORS.bubble,
              borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              padding: "10px 14px",
              fontSize: 13.5,
              lineHeight: 1.55,
              color: COLORS.text,
              whiteSpace: "pre-line",
            }}
          >
            {msg.text.includes("instagram.com") ? (
              <span style={{ color: COLORS.green, textDecoration: "underline", wordBreak: "break-all" }}>
                {msg.text}
              </span>
            ) : (
              msg.text
            )}
            {msg.menu && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                {msg.menu.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(37,211,102,0.12)",
                      border: `1px solid rgba(37,211,102,0.25)`,
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 12.5,
                      color: COLORS.green,
                      cursor: "default",
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div
          style={{
            fontSize: 10,
            color: COLORS.textDim,
            marginTop: 3,
            textAlign: isUser ? "right" : "left",
            paddingLeft: isUser ? 0 : 4,
          }}
        >
          {isUser ? "You" : "Reely"} · just now {isUser ? "✓✓" : ""}
        </div>
      </div>
    </div>
  );
}

function ResultCard({ result }) {
  const cat = categoryColors[result.category] || categoryColors.business;
  return (
    <div
      style={{
        background: "#151515",
        border: "1px solid #2a2a2a",
        borderRadius: 14,
        overflow: "hidden",
        width: 280,
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #0d1f17, #091a11)",
          padding: "10px 14px 8px",
          borderBottom: "1px solid #1e2e23",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 18 }}>🎯</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.green, letterSpacing: 0.5 }}>
          REELY OUTPUT
        </span>
        <span
          style={{
            marginLeft: "auto",
            background: cat.bg,
            color: cat.text,
            fontSize: 10,
            padding: "2px 8px",
            borderRadius: 20,
            fontWeight: 600,
          }}
        >
          {cat.label}
        </span>
      </div>
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 9, color: COLORS.textMuted, letterSpacing: 1, fontWeight: 700, marginBottom: 4 }}>
            SUMMARY
          </div>
          <div style={{ fontSize: 12.5, color: COLORS.text, lineHeight: 1.5 }}>{result.summary}</div>
        </div>
        <div
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: 8,
            padding: "8px 10px",
          }}
        >
          <div style={{ fontSize: 9, color: COLORS.amber, letterSpacing: 1, fontWeight: 700, marginBottom: 3 }}>
            KEY IDEA
          </div>
          <div style={{ fontSize: 12.5, color: COLORS.amberLight, lineHeight: 1.4 }}>{result.keyIdea}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: COLORS.textMuted, letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>
            ACTION STEPS
          </div>
          {result.steps.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: COLORS.green,
                  color: "#000",
                  fontSize: 9,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {i + 1}
              </div>
              <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.45 }}>{step}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WhatsAppDemo() {
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const bottomRef = useRef(null);
  const timeoutsRef = useRef([]);

  const clearAll = () => timeoutsRef.current.forEach(clearTimeout);

  const runDemo = () => {
    clearAll();
    setVisibleMessages([]);
    setTyping(false);
    setDone(false);
    setRunning(true);

    let cumulativeDelay = 500;
    DEMO_FLOW.forEach((msg, idx) => {
      const typingDelay = cumulativeDelay;
      cumulativeDelay += msg.delay;
      const showDelay = cumulativeDelay;
      cumulativeDelay += 300;

      if (msg.from === "bot") {
        const t1 = setTimeout(() => setTyping(true), typingDelay);
        timeoutsRef.current.push(t1);
      }
      const t2 = setTimeout(() => {
        setTyping(false);
        setVisibleMessages((prev) => [...prev, msg]);
        if (idx === DEMO_FLOW.length - 1) {
          setRunning(false);
          setDone(true);
        }
      }, showDelay);
      timeoutsRef.current.push(t2);
    });
  };

  useEffect(() => {
    const t = setTimeout(runDemo, 800);
    return () => { clearTimeout(t); clearAll(); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages, typing]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 360,
        background: "#0b141a",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)",
        fontFamily: "'SF Pro Text', -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#1f2c34",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.green}, ${COLORS.greenDark})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 800,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          R
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>Reely</div>
          <div style={{ fontSize: 11.5, color: COLORS.green }}>● Active now</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
          <span style={{ fontSize: 18, color: COLORS.textMuted }}>📞</span>
          <span style={{ fontSize: 18, color: COLORS.textMuted }}>⋮</span>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          height: 480,
          overflowY: "auto",
          padding: "16px 12px",
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='60' height='60' fill='%230b141a'/%3E%3C/svg%3E\")",
          scrollbarWidth: "none",
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            color: COLORS.textDim,
            marginBottom: 16,
            background: "rgba(0,0,0,0.3)",
            padding: "4px 12px",
            borderRadius: 20,
            display: "inline-block",
            width: "100%",
          }}
        >
          TODAY
        </div>
        {visibleMessages.map((msg, i) => (
          <ChatBubble key={i} msg={msg} visible={true} />
        ))}
        {typing && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, animation: "fadeSlideIn 0.3s ease" }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: `linear-gradient(135deg, ${COLORS.green}, ${COLORS.greenDark})`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0,
              }}
            >R</div>
            <div style={{ background: COLORS.bubble, borderRadius: "12px 12px 12px 2px", padding: "10px 14px" }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center", height: 16 }}>
                {[0, 0.2, 0.4].map((d, i) => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: "50%", background: COLORS.textMuted,
                    animation: `typingDot 1.2s ${d}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        style={{
          background: "#1f2c34",
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            flex: 1,
            background: "#2a3942",
            borderRadius: 24,
            padding: "9px 16px",
            fontSize: 13,
            color: COLORS.textMuted,
          }}
        >
          Paste reel link...
        </div>
        <div
          style={{
            width: 38, height: 38, borderRadius: "50%",
            background: COLORS.green,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: done || !running ? "pointer" : "default",
            opacity: done || !running ? 1 : 0.5,
            transition: "opacity 0.3s",
          }}
          onClick={!running ? runDemo : undefined}
          title={done ? "Replay demo" : ""}
        >
          <span style={{ fontSize: 16 }}>{done ? "↺" : "➤"}</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color }) {
  return (
    <div style={{
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 16,
      padding: "24px 20px",
      textAlign: "center",
      flex: 1,
      minWidth: 120,
    }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: color || COLORS.green, fontFamily: "'DM Serif Display', serif", letterSpacing: -1 }}>{value}</div>
      <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4, lineHeight: 1.4 }}>{label}</div>
    </div>
  );
}

function FlowStep({ number, icon, title, desc, highlight }) {
  return (
    <div style={{
      display: "flex",
      gap: 16,
      alignItems: "flex-start",
      padding: "20px",
      background: highlight ? "rgba(37,211,102,0.04)" : "transparent",
      border: `1px solid ${highlight ? "rgba(37,211,102,0.15)" : COLORS.border}`,
      borderRadius: 14,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        background: highlight ? COLORS.green : COLORS.surfaceLight,
        color: highlight ? "#000" : COLORS.textMuted,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, fontWeight: 800, flexShrink: 0,
      }}>{number}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>
          {icon} {title}
        </div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

function WeeklyNudge() {
  const items = [
    { emoji: "💼", title: "Cold DM Strategy", category: "business", saved: "Mon", status: "pending" },
    { emoji: "📱", title: "Instagram Reels Hook Formula", category: "content", saved: "Tue", status: "done" },
    { emoji: "🧠", title: "Deep Work 2-Hour Blocks", category: "learning", saved: "Wed", status: "pending" },
    { emoji: "💪", title: "7-Min Morning Routine", category: "health", saved: "Thu", status: "pending" },
  ];
  const cat = (c) => categoryColors[c] || categoryColors.business;
  return (
    <div style={{
      background: COLORS.surface, border: `1px solid ${COLORS.border}`,
      borderRadius: 20, overflow: "hidden", maxWidth: 380, width: "100%",
    }}>
      <div style={{
        background: "#0d1f17", padding: "14px 18px",
        borderBottom: "1px solid #1e2e23",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: 20 }}>📬</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.green }}>Weekly Reely Digest</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted }}>4 reels saved · 3 actions pending</div>
        </div>
      </div>
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 12px", background: COLORS.surfaceLight,
            borderRadius: 10, border: `1px solid ${COLORS.border}`,
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{item.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
              <span style={{
                fontSize: 10, background: cat(item.category).bg,
                color: cat(item.category).text, padding: "1px 6px", borderRadius: 20,
              }}>{cat(item.category).label}</span>
            </div>
            <div style={{
              fontSize: 10, padding: "3px 8px", borderRadius: 20, flexShrink: 0,
              background: item.status === "done" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
              color: item.status === "done" ? "#22C55E" : COLORS.amber,
              border: `1px solid ${item.status === "done" ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`,
            }}>
              {item.status === "done" ? "✓ Done" : "⏳ Pending"}
            </div>
          </div>
        ))}
        <div style={{
          marginTop: 4, padding: "10px 14px",
          background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
          borderRadius: 10, fontSize: 12.5, color: COLORS.amberLight, lineHeight: 1.5,
        }}>
          ⚡ You have <strong>3 pending actions</strong>. Pick one to do today. 5 minutes is enough to start.
        </div>
      </div>
    </div>
  );
}

export default function ReelyApp() {
  const [activeTab, setActiveTab] = useState("demo");

  return (
    <div style={{
      minHeight: "100vh", background: COLORS.bg,
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      color: COLORS.text,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap');
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(10,10,10,0.9)", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${COLORS.border}`,
        padding: "0 24px", height: 58,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: `linear-gradient(135deg, ${COLORS.green}, ${COLORS.greenDark})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, color: "#fff",
          }}>R</div>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "'DM Serif Display', serif" }}>Reely</span>
          <span style={{
            fontSize: 10, background: "rgba(37,211,102,0.1)", color: COLORS.green,
            border: "1px solid rgba(37,211,102,0.3)", padding: "2px 8px", borderRadius: 20,
          }}>MVP</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["demo", "flow", "retention"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 500,
              background: activeTab === tab ? COLORS.green : "transparent",
              color: activeTab === tab ? "#000" : COLORS.textMuted,
              transition: "all 0.2s",
            }}>
              {tab === "demo" ? "Demo" : tab === "flow" ? "User Flow" : "Retention"}
            </button>
          ))}
        </div>
      </nav>

      {/* Hero */}
      <div style={{
        maxWidth: 1100, margin: "0 auto", padding: "80px 24px 60px",
        display: "grid", gridTemplateColumns: "1fr auto",
        gap: 60, alignItems: "center",
        "@media(max-width:768px)": { gridTemplateColumns: "1fr" },
      }}>
        <div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.2)",
            padding: "6px 14px", borderRadius: 30, marginBottom: 28,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.green, animation: "pulse 2s infinite", display: "inline-block" }} />
            <span style={{ fontSize: 12, color: COLORS.green, fontWeight: 600 }}>WhatsApp-native · No app needed</span>
          </div>

          <h1 style={{
            fontSize: "clamp(42px, 5vw, 64px)",
            fontFamily: "'DM Serif Display', serif",
            fontWeight: 400, lineHeight: 1.1,
            margin: "0 0 20px",
            letterSpacing: -1.5,
          }}>
            Stop saving.<br />
            <span style={{ color: COLORS.green }}>Start doing.</span>
          </h1>

          <p style={{
            fontSize: 18, color: COLORS.textMuted, lineHeight: 1.65,
            maxWidth: 480, margin: "0 0 36px",
          }}>
            Share an Instagram reel on WhatsApp. Reely converts it into a <strong style={{ color: COLORS.text }}>summary, key idea, and 3–5 action steps</strong> you can actually execute. Not a note-taker. An execution engine.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button style={{
              padding: "14px 28px", borderRadius: 12, border: "none",
              background: COLORS.green, color: "#000", fontWeight: 700,
              fontSize: 15, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Try the demo →
            </button>
            <button style={{
              padding: "14px 28px", borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              background: "transparent", color: COLORS.text,
              fontWeight: 600, fontSize: 15, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              See user flow
            </button>
          </div>

          <div style={{ display: "flex", gap: 32, marginTop: 48, flexWrap: "wrap" }}>
            {[
              { v: "7 days", l: "to build MVP" },
              { v: "0 apps", l: "just WhatsApp" },
              { v: "5 steps", l: "max per reel" },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'DM Serif Display', serif", color: COLORS.green }}>{s.v}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat demo */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <WhatsAppDemo />
        </div>
      </div>

      {/* Tab content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>

        {activeTab === "demo" && (
          <div style={{ animation: "fadeSlideIn 0.4s ease" }}>
            {/* Stats */}
            <div style={{ marginBottom: 60 }}>
              <h2 style={{
                fontFamily: "'DM Serif Display', serif", fontSize: 32,
                fontWeight: 400, marginBottom: 8, letterSpacing: -0.5,
              }}>Validate these<br /><span style={{ color: COLORS.green }}>success metrics</span></h2>
              <p style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 32 }}>Track these two numbers. Everything else is noise.</p>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <StatCard icon="🔁" value="%" label="Users who share 2+ reels" color={COLORS.green} />
                <StatCard icon="✅" value="%" label="Users who complete 1 action" color={COLORS.amber} />
                <StatCard icon="📬" value="%" label="Weekly digest open rate" color={COLORS.blue} />
                <StatCard icon="⏰" value="%" label="Reminders that trigger action" color={COLORS.purple} />
              </div>
            </div>

            {/* Categories */}
            <div>
              <h2 style={{
                fontFamily: "'DM Serif Display', serif", fontSize: 32,
                fontWeight: 400, marginBottom: 32, letterSpacing: -0.5,
              }}>Four<br /><span style={{ color: COLORS.green }}>content buckets</span></h2>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {Object.entries(categoryColors).map(([key, val]) => (
                  <div key={key} style={{
                    flex: "1 1 200px",
                    background: val.bg, border: `1px solid ${val.text}22`,
                    borderRadius: 14, padding: "20px",
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>{val.label.split(" ")[0]}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: val.text, marginBottom: 6, textTransform: "capitalize" }}>{key}</div>
                    <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
                      {key === "business" && "Startup tactics, growth hacks, sales, ops, hiring"}
                      {key === "content" && "Hooks, formats, scripts, editing, distribution"}
                      {key === "health" && "Routines, workouts, nutrition, recovery, sleep"}
                      {key === "learning" && "Mental models, frameworks, skills, book summaries"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "flow" && (
          <div style={{ animation: "fadeSlideIn 0.4s ease" }}>
            <h2 style={{
              fontFamily: "'DM Serif Display', serif", fontSize: 40,
              fontWeight: 400, marginBottom: 8, letterSpacing: -1,
            }}>User flow<br /><span style={{ color: COLORS.green }}>end to end</span></h2>
            <p style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 40 }}>Every step designed for minimum friction, maximum output.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { n: 1, icon: "📲", title: "Share the reel", desc: "User pastes an Instagram reel URL in the Reely WhatsApp chat. No app install, no sign-up.", h: true },
                { n: 2, icon: "🤖", title: "Bot asks intent", desc: "Reely responds instantly: \"What do you want? Summary / Action Steps / Content Idea\"" },
                { n: 3, icon: "⚡", title: "AI processes it", desc: "OpenAI extracts summary, key idea, 3–5 action steps, and assigns a category in under 5 seconds.", h: true },
                { n: 4, icon: "📋", title: "Output delivered", desc: "Clean, structured WhatsApp message with the reel's distilled value — nothing fluffy, all execution." },
                { n: 5, icon: "💾", title: "User takes action", desc: "Save it, add to tasks, or set a reminder. One tap, one decision, no friction." },
                { n: 6, icon: "📬", title: "Weekly nudge", desc: "Every Sunday: digest of pending actions + top 3 to prioritise. Behavior change loop closed.", h: true },
              ].map((s) => (
                <FlowStep key={s.n} number={s.n} icon={s.icon} title={s.title} desc={s.desc} highlight={s.h} />
              ))}
            </div>

            {/* Tech stack */}
            <div style={{ marginTop: 48, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: "28px 28px" }}>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, fontWeight: 400, marginBottom: 24, marginTop: 0 }}>
                Tech stack · <span style={{ color: COLORS.green }}>7-day build</span>
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                {[
                  { icon: "💬", name: "Twilio", role: "WhatsApp API" },
                  { icon: "🟢", name: "Node.js", role: "Backend / Webhook" },
                  { icon: "🤖", name: "OpenAI GPT-4o", role: "AI processing" },
                  { icon: "🗄️", name: "Supabase", role: "Storage / DB" },
                  { icon: "☁️", name: "Railway / Render", role: "Hosting" },
                  { icon: "📱", name: "WhatsApp", role: "User interface" },
                ].map((t, i) => (
                  <div key={i} style={{
                    background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`,
                    borderRadius: 12, padding: "14px 16px",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <span style={{ fontSize: 22 }}>{t.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: COLORS.textMuted }}>{t.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "retention" && (
          <div style={{ animation: "fadeSlideIn 0.4s ease" }}>
            <h2 style={{
              fontFamily: "'DM Serif Display', serif", fontSize: 40,
              fontWeight: 400, marginBottom: 8, letterSpacing: -1,
            }}>Retention<br /><span style={{ color: COLORS.green }}>loop design</span></h2>
            <p style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 40 }}>
              The real validation isn't whether users send one reel. It's whether they come back.
            </p>

            <div style={{ display: "flex", gap: 40, flexWrap: "wrap", alignItems: "flex-start" }}>
              <WeeklyNudge />

              <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  {
                    icon: "🔁", title: "Multi-reel behavior",
                    desc: "If a user sends 3+ reels in the first week, they're hooked. Track this as your primary activation metric.",
                    color: COLORS.green,
                  },
                  {
                    icon: "📬", title: "Weekly digest (WhatsApp)",
                    desc: "Every Sunday at 10 AM: saved reels, pending actions, and one sharp nudge. No email. WhatsApp only.",
                    color: COLORS.amber,
                  },
                  {
                    icon: "⏰", title: "Smart reminders",
                    desc: "User sets a reminder on any action step. Bot follows up at that time with just the step — not the whole reel.",
                    color: COLORS.blue,
                  },
                  {
                    icon: "🏆", title: "\"Top pending\" nudge",
                    desc: "Mid-week: \"You have 4 actions pending. Here's the one you can do in 5 minutes.\" Specificity drives action.",
                    color: COLORS.purple,
                  },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                    borderRadius: 14, padding: "18px 20px",
                    display: "flex", gap: 14, alignItems: "flex-start",
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: `${item.color}15`, border: `1px solid ${item.color}30`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                    }}>{item.icon}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 5 }}>{item.title}</div>
                      <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.55 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: `1px solid ${COLORS.border}`,
        padding: "24px",
        textAlign: "center",
        fontSize: 12,
        color: COLORS.textDim,
      }}>
        Reely MVP · Built for validation · Not a note-taker. An execution engine.
      </div>
    </div>
  );
}
