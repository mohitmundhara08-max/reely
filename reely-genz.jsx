import { useState, useEffect, useRef, useCallback } from "react";

const BOT_URL = "https://sweet-commitment-reely.up.railway.app";
const USER_ID = "+919874979150";

const C = {
  bg:      "#0a0a0a",
  s1:      "#111111",
  s2:      "#181818",
  border:  "#242424",
  pink:    "#FF2D78",
  yellow:  "#FFE500",
  mint:    "#00F0C8",
  purple:  "#9B5DE5",
  blue:    "#4CC9F0",
  orange:  "#FF6B35",
  white:   "#F5F5F5",
  muted:   "#666",
  dim:     "#333",
};

const ACCENT = [C.pink, C.yellow, C.mint, C.purple, C.blue, C.orange];
function pickColor(str) { let h=0; for(let i=0;i<str.length;i++) h=str.charCodeAt(i)+h*31; return ACCENT[Math.abs(h)%ACCENT.length]; }

function uid() { return Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4); }
function timeAgo(ts) {
  const s=Math.floor((Date.now()-new Date(ts).getTime())/1000);
  if(s<60) return "just now"; if(s<3600) return `${Math.floor(s/60)}m`;
  if(s<86400) return `${Math.floor(s/3600)}h`; return `${Math.floor(s/86400)}d`;
}
function fmtDate(d) {
  if(!d) return null;
  const dt=new Date(d); dt.setHours(0,0,0,0);
  const now=new Date(); now.setHours(0,0,0,0);
  const diff=Math.round((dt-now)/86400000);
  if(diff<0) return {label:`${Math.abs(diff)}d late`,danger:true};
  if(diff===0) return {label:"today!!",danger:false};
  if(diff===1) return {label:"tmrw",danger:false};
  return {label:dt.toLocaleDateString("en-IN",{day:"numeric",month:"short"}),danger:false};
}
function plat(url="") {
  if(/instagram\.com/i.test(url)) return "IG";
  if(/youtube\.com|youtu\.be/i.test(url)) return "YT";
  if(/tiktok\.com/i.test(url)) return "TK";
  if(/twitter\.com|x\.com/i.test(url)) return "X";
  return "↗";
}
function shortUrl(url="") { return url.replace(/https?:\/\/(www\.)?/,"").slice(0,38)+(url.length>38?"…":""); }

// ── Doodles ───────────────────────────────────────────────────────────────────
const Squiggle = ({color=C.pink,w=120,style={}}) => (
  <svg width={w} height={12} viewBox={`0 0 ${w} 12`} style={{display:"block",...style}}>
    <path d={`M0,6 ${Array.from({length:Math.floor(w/12)},(_,i)=>`Q${i*12+6},${i%2===0?0:12} ${(i+1)*12},6`).join(" ")}`}
      fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const Star = ({color=C.yellow,size=20,style={}}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"
      fill={color} stroke="none"/>
  </svg>
);

const Asterisk = ({color=C.mint,size=18,style={}}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
    {[0,45,90,135].map(a=>(
      <line key={a} x1="12" y1="2" x2="12" y2="22"
        stroke={color} strokeWidth="2.5" strokeLinecap="round"
        transform={`rotate(${a} 12 12)`}/>
    ))}
  </svg>
);

const ZigZag = ({color=C.purple,style={}}) => (
  <svg width="60" height="24" viewBox="0 0 60 24" style={style}>
    <polyline points="0,20 10,4 20,20 30,4 40,20 50,4 60,20"
      fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── AI ────────────────────────────────────────────────────────────────────────
async function callAI(messages, system) {
  const r = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system,messages}),
  });
  const d = await r.json();
  return d.content?.[0]?.text ?? "Error.";
}

const QUICK = [
  {id:"sum",   label:"✦ summarise",  prompt:"Summarise what this content is likely about. Be specific and punchy."},
  {id:"todo",  label:"✓ to-do list", prompt:"Turn this into 3-5 specific, immediately doable action items. Keep it tight."},
  {id:"cont",  label:"✏ content idea",prompt:"Give me 3 specific content ideas inspired by this. Be creative."},
  {id:"deep",  label:"⌕ deep search",prompt:"What should I research from this? Give specific queries and rabbit holes."},
  {id:"music", label:"♪ find music", prompt:"How do I find and use the audio/music from this? Tools and steps."},
  {id:"free",  label:"↗ ask anything",prompt:null},
];

function AIPanel({reel,onClose}) {
  const [msgs,setMsgs]=useState([]); const [inp,setInp]=useState("");
  const [busy,setBusy]=useState(false); const [free,setFree]=useState(false);
  const endRef=useRef();

  const sys=`You help act on saved content. Be punchy, specific, under 120 words. Short lines.
URL: ${reel.url} | Creator: ${reel.creator?"@"+reel.creator:"unknown"} | Note: ${reel.note||"none"}`;

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,busy]);

  async function send(p) {
    if(!p?.trim()||busy) return; setBusy(true);
    const next=[...msgs,{role:"user",content:p}]; setMsgs(next); setInp("");
    const reply=await callAI(next,sys);
    setMsgs([...next,{role:"assistant",content:reply}]); setBusy(false);
  }

  return (
    <div style={{background:C.s1,borderTop:`1px solid ${C.border}`,padding:"14px 16px",display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Asterisk color={C.mint} size={16}/>
          <span style={{fontSize:11,fontFamily:"monospace",color:C.mint,letterSpacing:1}}>AI DEEP DIVE</span>
        </div>
        <button onClick={onClose} style={{background:C.dim,border:"none",borderRadius:"50%",width:22,height:22,cursor:"pointer",color:C.white,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>

      {msgs.length===0&&!free&&(
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {QUICK.map(a=>(
            <button key={a.id} onClick={()=>a.id==="free"?setFree(true):send(a.prompt)}
              style={{fontSize:11,padding:"5px 12px",background:"transparent",border:`1px solid ${C.mint}44`,borderRadius:20,color:C.mint,cursor:"pointer",fontFamily:"monospace",transition:"all 0.15s"}}>
              {a.label}
            </button>
          ))}
        </div>
      )}

      {msgs.length>0&&(
        <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:240,overflowY:"auto",scrollbarWidth:"none"}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{
              fontSize:13,lineHeight:1.6,padding:"10px 12px",borderRadius:12,whiteSpace:"pre-wrap",
              background:m.role==="user"?C.s2:C.s1,
              border:`1px solid ${m.role==="user"?C.purple+"55":C.mint+"33"}`,
              color:m.role==="user"?C.purple:C.white,
              alignSelf:m.role==="user"?"flex-end":"flex-start",maxWidth:"90%",
            }}>{m.content}</div>
          ))}
          {busy&&<span style={{fontSize:12,fontFamily:"monospace",color:C.mint,animation:"pulse 1s infinite"}}>thinking...</span>}
          <div ref={endRef}/>
        </div>
      )}

      {(msgs.length>0||free)&&(
        <div style={{display:"flex",gap:8}}>
          <input autoFocus value={inp} onChange={e=>setInp(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&send(inp)}
            placeholder="ask anything..." style={{flex:1,fontSize:13,background:C.s2,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 14px",color:C.white,outline:"none",fontFamily:"monospace"}}/>
          <button onClick={()=>send(inp)} disabled={busy||!inp.trim()} style={{background:C.mint,border:"none",borderRadius:10,padding:"0 16px",color:"#000",fontWeight:700,cursor:"pointer",fontSize:14}}>→</button>
        </div>
      )}
    </div>
  );
}

// ── Reel Card ─────────────────────────────────────────────────────────────────
function ReelCard({reel,onStatus,onDelete,idx=0}) {
  const [open,setOpen]=useState(false); const [ai,setAi]=useState(false);
  const accent=pickColor(reel.url);
  const dl=fmtDate(reel.reminder);
  const p=plat(reel.url);

  return (
    <div style={{
      background:C.s1, border:`1px solid ${C.border}`,
      borderLeft:`3px solid ${accent}`, borderRadius:14,
      overflow:"hidden", opacity:reel.status==="done"?0.45:1,
      animation:`cardIn 0.3s ${idx*0.05}s ease both`,
      transition:"transform 0.15s,box-shadow 0.15s",
    }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 8px 24px ${accent}22`;}}
      onMouseLeave={e=>{e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="";}}
    >
      <div onClick={()=>{setOpen(!open);if(!open)setAi(false);}} style={{padding:"12px 14px",cursor:"pointer",display:"flex",flexDirection:"column",gap:7}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,fontFamily:"monospace",fontWeight:700,color:accent,background:accent+"18",border:`1px solid ${accent}44`,padding:"2px 8px",borderRadius:20}}>{p}</span>
          {reel.creator&&<span style={{fontSize:13,fontWeight:700,color:C.white}}>@{reel.creator}</span>}
          {reel.status==="done"&&<span style={{fontSize:10,fontFamily:"monospace",background:C.mint+"22",color:C.mint,padding:"1px 8px",borderRadius:20,border:`1px solid ${C.mint}44`}}>✓ done</span>}
          <span style={{marginLeft:"auto",fontSize:10,fontFamily:"monospace",color:C.muted}}>{timeAgo(reel.created_at||reel.createdAt)}</span>
        </div>

        <div style={{fontSize:11,fontFamily:"monospace",color:C.muted}}>{shortUrl(reel.url)}</div>

        {reel.note&&<div style={{fontSize:13,color:"#ccc",lineHeight:1.5,borderLeft:`2px solid ${accent}55`,paddingLeft:10,borderRadius:0}}>{reel.note}</div>}

        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {dl&&<span style={{fontSize:10,fontFamily:"monospace",color:dl.danger?C.pink:C.yellow}}>◷ {dl.label}</span>}
          <span style={{marginLeft:"auto",fontSize:10,color:C.dim}}>{open?"▲":"▼"}</span>
        </div>
      </div>

      {open&&(
        <div style={{borderTop:`1px solid ${C.border}`}}>
          <div style={{padding:"10px 14px",display:"flex",flexDirection:"column",gap:10}}>
            <a href={reel.url} target="_blank" rel="noopener noreferrer"
              style={{fontSize:11,fontFamily:"monospace",color:C.blue,wordBreak:"break-all"}}
              onClick={e=>e.stopPropagation()}>↗ open reel</a>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {reel.status!=="done"&&<Btn label="✓ done" color={C.mint} onClick={()=>onStatus(reel.id,"done")}/>}
              {reel.status!=="saved"&&<Btn label="↺ reset" color={C.muted} onClick={()=>onStatus(reel.id,"saved")}/>}
              {reel.status!=="skipped"&&<Btn label="✕ skip" color={C.orange} onClick={()=>onStatus(reel.id,"skipped")}/>}
              <button onClick={()=>setAi(!ai)} style={{
                fontSize:11,fontFamily:"monospace",padding:"5px 12px",borderRadius:20,cursor:"pointer",
                background:ai?C.purple+"33":"transparent",
                border:`1px solid ${C.purple}`,color:C.purple,
                animation:!ai?"aiPulse 2s infinite":"none",
              }}>✦ AI deep dive</button>
              <Btn label="✕ delete" color={C.pink} onClick={()=>onDelete(reel.id)} style={{marginLeft:"auto"}}/>
            </div>
          </div>
          {ai&&<AIPanel reel={reel} onClose={()=>setAi(false)}/>}
        </div>
      )}
    </div>
  );
}

function Btn({label,color,onClick,style={}}) {
  return (
    <button onClick={onClick} style={{
      fontSize:11,fontFamily:"monospace",padding:"5px 12px",borderRadius:20,
      background:"transparent",border:`1px solid ${color}55`,color,cursor:"pointer",
      transition:"all 0.15s",...style,
    }}
      onMouseEnter={e=>{e.currentTarget.style.background=color+"22";}}
      onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}
    >{label}</button>
  );
}

// ── Add Panel ─────────────────────────────────────────────────────────────────
function AddPanel({onAdd,onClose}) {
  const [url,setUrl]=useState(""); const [creator,setCreator]=useState("");
  const [note,setNote]=useState(""); const [reminder,setReminder]=useState("");
  const [mode,setMode]=useState("save");
  const valid=url.trim().startsWith("http");

  function save() {
    if(!valid) return;
    let c=creator.trim().replace("@","");
    if(!c){const m=url.match(/instagram\.com\/([a-zA-Z0-9._]+)\//);if(m&&!["p","reel","reels","stories","tv","explore"].includes(m[1]))c=m[1];}
    onAdd({id:uid(),url:url.trim(),creator:c||null,note:note.trim()||null,reminder:mode==="remind"?reminder:null,status:"saved",created_at:new Date().toISOString()});
  }

  return (
    <div style={{background:C.s1,border:`1px solid ${C.pink}55`,borderRadius:16,padding:"18px 20px",marginBottom:20,animation:"slideDown 0.25s ease",display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Star color={C.yellow} size={18}/>
          <span style={{fontSize:14,fontWeight:700,color:C.white,fontFamily:"monospace"}}>save a reel</span>
        </div>
        <button onClick={onClose} style={{background:C.dim,border:"none",borderRadius:"50%",width:24,height:24,cursor:"pointer",color:C.white,fontSize:13}}>✕</button>
      </div>
      {[
        {v:url,s:setUrl,p:"paste any link...",mono:true,onK:e=>e.key==="Enter"&&save()},
        {v:creator,s:setCreator,p:"@creator handle (optional)"},
      ].map((f,i)=>(
        <input key={i} value={f.v} onChange={e=>f.s(e.target.value)} onKeyDown={f.onK}
          placeholder={f.p} style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",color:C.white,fontSize:13,outline:"none",fontFamily:f.mono?"monospace":"inherit",transition:"border-color 0.2s"}}
          onFocus={e=>e.target.style.borderColor=C.pink}
          onBlur={e=>e.target.style.borderColor=C.border}/>
      ))}
      <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="why did you save this? (optional)" rows={2}
        style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",color:C.white,fontSize:13,outline:"none",resize:"none"}}
        onFocus={e=>e.target.style.borderColor=C.purple} onBlur={e=>e.target.style.borderColor=C.border}/>
      <div style={{display:"flex",gap:8}}>
        {[{v:"save",l:"just save ✓"},{v:"remind",l:"remind me ◷"}].map(m=>(
          <button key={m.v} onClick={()=>setMode(m.v)} style={{
            flex:1,padding:"9px",borderRadius:10,cursor:"pointer",fontFamily:"monospace",fontSize:12,fontWeight:700,
            background:mode===m.v?C.pink:"transparent",
            color:mode===m.v?"#000":C.muted,
            border:`1px solid ${mode===m.v?C.pink:C.border}`,
            transition:"all 0.2s",
          }}>{m.l}</button>
        ))}
      </div>
      {mode==="remind"&&(
        <input type="date" value={reminder} onChange={e=>setReminder(e.target.value)}
          style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 14px",color:C.white,fontSize:12,outline:"none",colorScheme:"dark"}}/>
      )}
      <button onClick={save} disabled={!valid} style={{
        padding:"11px",borderRadius:10,border:"none",cursor:valid?"pointer":"default",
        background:valid?`linear-gradient(135deg,${C.pink},${C.purple})`:"#222",
        color:valid?"#fff":C.muted,fontWeight:700,fontSize:14,fontFamily:"monospace",
        transition:"opacity 0.2s",opacity:valid?1:0.5,
      }}>save to reely →</button>
    </div>
  );
}

// ── Views ─────────────────────────────────────────────────────────────────────
function AllView({reels,onStatus,onDelete}) {
  const [f,setF]=useState("saved");
  const filtered=reels.filter(r=>f==="all"||r.status===f)
    .sort((a,b)=>{
      const da=a.reminder?new Date(a.reminder):null,db=b.reminder?new Date(b.reminder):null;
      if(da&&!db)return -1;if(!da&&db)return 1;if(da&&db)return da-db;
      return new Date(b.created_at||b.createdAt)-new Date(a.created_at||a.createdAt);
    });

  return <>
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {["all","saved","done","skipped"].map(s=>{
        const colors={all:C.white,saved:C.blue,done:C.mint,skipped:C.orange};
        const active=f===s;
        return (
          <button key={s} onClick={()=>setF(s)} style={{
            fontSize:11,fontFamily:"monospace",fontWeight:700,
            padding:"5px 14px",borderRadius:20,cursor:"pointer",
            background:active?colors[s]:"transparent",
            color:active?"#000":C.muted,
            border:`1px solid ${active?colors[s]:C.border}`,
            transition:"all 0.15s",
          }}>
            {s} <span style={{opacity:0.6}}>{s==="all"?reels.length:reels.filter(r=>r.status===s).length}</span>
          </button>
        );
      })}
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {filtered.length===0
        ?<EmptyMsg text="nothing here yet~"/>
        :filtered.map((r,i)=><ReelCard key={r.id} reel={r} onStatus={onStatus} onDelete={onDelete} idx={i}/>)}
    </div>
  </>;
}

function CreatorView({reels,onStatus,onDelete}) {
  const groups={};
  reels.forEach(r=>{const k=r.creator||"__none";if(!groups[k])groups[k]=[];groups[k].push(r);});
  const sorted=Object.entries(groups).filter(([k])=>k!=="__none").sort((a,b)=>b[1].length-a[1].length);
  const none=groups["__none"]||[];

  if(sorted.length===0&&none.length===0) return <EmptyMsg text="no creators tagged yet. add @handle when saving!"/>;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {sorted.map(([creator,items])=>{
        const done=items.filter(r=>r.status==="done").length;
        const acc=pickColor(creator);
        const pct=Math.round((done/items.length)*100);
        return (
          <div key={creator} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden"}}>
            <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:acc+"22",border:`2px solid ${acc}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:acc,flexShrink:0}}>
                {creator[0].toUpperCase()}
              </div>
              <div>
                <p style={{fontSize:15,fontWeight:700,color:C.white,margin:0,fontFamily:"monospace"}}>@{creator}</p>
                <p style={{fontSize:11,color:C.muted,margin:0,fontFamily:"monospace"}}>{items.length} saved · {done} done</p>
              </div>
              <div style={{marginLeft:"auto",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                <span style={{fontSize:11,fontFamily:"monospace",color:acc,fontWeight:700}}>{pct}%</span>
                <div style={{width:60,height:4,background:C.border,borderRadius:99}}>
                  <div style={{width:`${pct}%`,height:"100%",background:acc,borderRadius:99,transition:"width 0.5s ease"}}/>
                </div>
              </div>
            </div>
            <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}}>
              {items.map((r,i)=><ReelCard key={r.id} reel={r} onStatus={onStatus} onDelete={onDelete} idx={i}/>)}
            </div>
          </div>
        );
      })}
      {none.length>0&&(
        <div>
          <p style={{fontSize:11,fontFamily:"monospace",color:C.muted,marginBottom:10}}>no creator tagged — {none.length}</p>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {none.map((r,i)=><ReelCard key={r.id} reel={r} onStatus={onStatus} onDelete={onDelete} idx={i}/>)}
          </div>
        </div>
      )}
    </div>
  );
}

function RemindersView({reels,onStatus,onDelete}) {
  const today=new Date();today.setHours(0,0,0,0);
  const overdue=reels.filter(r=>r.reminder&&r.status==="saved"&&new Date(r.reminder)<today);
  const upcoming=reels.filter(r=>{if(!r.reminder||r.status!=="saved")return false;const d=new Date(r.reminder);d.setHours(0,0,0,0);return d>=today;}).sort((a,b)=>new Date(a.reminder)-new Date(b.reminder));
  if(overdue.length+upcoming.length===0) return <EmptyMsg text="no reminders set. reply '2' to bot when saving!"/>;
  return <>
    {overdue.length>0&&<>
      <SectionLabel label="🔥 overdue" color={C.pink}/>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
        {overdue.map((r,i)=><ReelCard key={r.id} reel={r} onStatus={onStatus} onDelete={onDelete} idx={i}/>)}
      </div>
    </>}
    {upcoming.length>0&&<>
      <SectionLabel label="📅 coming up" color={C.yellow}/>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {upcoming.map((r,i)=><ReelCard key={r.id} reel={r} onStatus={onStatus} onDelete={onDelete} idx={i}/>)}
      </div>
    </>}
  </>;
}

function SectionLabel({label,color}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
      <span style={{fontSize:11,fontFamily:"monospace",fontWeight:700,color,letterSpacing:1}}>{label}</span>
      <div style={{flex:1,height:1,background:`linear-gradient(90deg,${color}44,transparent)`}}/>
    </div>
  );
}

function EmptyMsg({text}) {
  return (
    <div style={{textAlign:"center",padding:"60px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
      <ZigZag color={C.purple} style={{opacity:0.4}}/>
      <p style={{fontSize:13,fontFamily:"monospace",color:C.muted}}>{text}</p>
      <Squiggle color={C.pink} w={80} style={{opacity:0.3}}/>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
const TABS=[{id:"all",label:"all reels"},{id:"creators",label:"creators"},{id:"reminders",label:"reminders"}];

export default function ReelyApp() {
  const [reels,setReels]=useState([]); const [view,setView]=useState("all");
  const [showAdd,setAdd]=useState(false); const [syncing,setSyncing]=useState(false);
  const [lastSync,setLastSync]=useState(null); const [loaded,setLoaded]=useState(false);

  useEffect(()=>{
    (async()=>{
      try{const r=await window.storage.get("reely_local");if(r?.value)setReels(JSON.parse(r.value));}catch(_){}
      setLoaded(true);
    })();
  },[]);

  useEffect(()=>{if(!loaded)return;window.storage.set("reely_local",JSON.stringify(reels)).catch(()=>{});},[reels,loaded]);

  const sync=useCallback(async()=>{
    setSyncing(true);
    try{
      const res=await fetch(`${BOT_URL}/reels/${encodeURIComponent(USER_ID)}`);
      const data=await res.json();
      setReels(prev=>{const ids=new Set(prev.map(r=>r.id));const fresh=data.filter(r=>!ids.has(r.id));return fresh.length>0?[...fresh,...prev]:prev;});
      setLastSync(new Date());
    }catch(e){console.error(e);}
    setSyncing(false);
  },[]);

  useEffect(()=>{if(!loaded)return;sync();const t=setInterval(sync,30000);return()=>clearInterval(t);},[loaded,sync]);

  const addReel=useCallback(r=>{setReels(p=>[r,...p]);setAdd(false);},[]);
  const setStatus=useCallback((id,s)=>setReels(p=>p.map(r=>r.id===id?{...r,status:s}:r)),[]);
  const delReel=useCallback(id=>setReels(p=>p.filter(r=>r.id!==id)),[]);

  const today=new Date();today.setHours(0,0,0,0);
  const stats=[
    {v:reels.length,l:"saved",c:C.white},
    {v:reels.filter(r=>r.status==="saved").length,l:"pending",c:C.blue},
    {v:reels.filter(r=>r.status==="done").length,l:"done",c:C.mint},
    ...(reels.filter(r=>r.reminder&&r.status==="saved"&&new Date(r.reminder)<today).length>0
      ?[{v:reels.filter(r=>r.reminder&&r.status==="saved"&&new Date(r.reminder)<today).length,l:"overdue",c:C.pink}]:[]),
  ];

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:"'DM Sans',-apple-system,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        @keyframes cardIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes aiPulse{0%,100%{box-shadow:0 0 0 0 ${C.purple}44}50%{box-shadow:0 0 0 4px ${C.purple}11}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:${C.dim};border-radius:3px}
        button{font-family:inherit;cursor:pointer;}
        input,textarea{font-family:inherit;}
      `}</style>

      {/* Header */}
      <div style={{
        position:"sticky",top:0,zIndex:50,
        background:`${C.bg}ee`,backdropFilter:"blur(12px)",
        borderBottom:`1px solid ${C.border}`,
        padding:"0 20px",height:58,
        display:"flex",alignItems:"center",gap:16,
      }}>
        {/* Logo */}
        <div style={{display:"flex",flexDirection:"column",gap:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:20,fontWeight:800,letterSpacing:-0.5,color:C.white}}>reely</span>
            <Star color={C.yellow} size={16} style={{animation:"float 2s ease-in-out infinite"}}/>
          </div>
          <Squiggle color={C.pink} w={52} style={{marginTop:-2}}/>
        </div>

        {/* Stats */}
        <div style={{display:"flex",gap:6}}>
          {stats.map((s,i)=>(
            <span key={i} style={{
              fontSize:11,fontFamily:"monospace",fontWeight:700,
              color:s.c,background:s.c+"15",
              padding:"3px 10px",borderRadius:20,
              border:`1px solid ${s.c}33`,
            }}>{s.v} {s.l}</span>
          ))}
        </div>

        {/* Sync + Add */}
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={sync} style={{
            fontSize:10,fontFamily:"monospace",background:"transparent",
            border:`1px solid ${C.border}`,borderRadius:20,padding:"4px 10px",
            color:C.muted,display:"flex",alignItems:"center",gap:5,
          }}>
            <span style={{display:"inline-block",animation:syncing?"spin 1s linear infinite":"none"}}>↺</span>
            {syncing?"syncing":lastSync?timeAgo(lastSync):"sync"}
          </button>
          <button onClick={()=>setAdd(!showAdd)} style={{
            fontSize:12,fontFamily:"monospace",fontWeight:700,
            background:showAdd?"transparent":`linear-gradient(135deg,${C.pink},${C.purple})`,
            border:`1px solid ${showAdd?C.border:"transparent"}`,
            color:showAdd?C.muted:"#fff",
            padding:"7px 16px",borderRadius:20,transition:"all 0.2s",
          }}>
            {showAdd?"✕ cancel":"+ add reel"}
          </button>
        </div>
      </div>

      <div style={{maxWidth:700,margin:"0 auto",padding:"24px 20px 80px"}}>

        {showAdd&&<AddPanel onAdd={addReel} onClose={()=>setAdd(false)}/>}

        {/* Tab bar */}
        <div style={{display:"flex",gap:0,marginBottom:24,background:C.s1,borderRadius:12,padding:4,border:`1px solid ${C.border}`}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setView(t.id)} style={{
              flex:1,padding:"9px 0",border:"none",fontFamily:"monospace",fontSize:12,fontWeight:700,
              cursor:"pointer",borderRadius:10,transition:"all 0.2s",
              background:view===t.id?C.s2:"transparent",
              color:view===t.id?C.white:C.muted,
              boxShadow:view===t.id?`0 0 0 1px ${C.border}`:"none",
            }}>{t.label}</button>
          ))}
        </div>

        {/* Empty state */}
        {reels.length===0&&!showAdd&&(
          <div style={{textAlign:"center",padding:"80px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
            <div style={{display:"flex",gap:12,opacity:0.5}}>
              <Star color={C.yellow} size={24}/>
              <Asterisk color={C.mint} size={24}/>
              <Star color={C.pink} size={20}/>
            </div>
            <p style={{fontSize:22,fontWeight:800,color:C.white}}>nothing saved yet</p>
            <p style={{fontSize:13,fontFamily:"monospace",color:C.muted,lineHeight:1.7,maxWidth:380}}>
              share any insta reel to the twilio whatsapp number.<br/>
              bot asks one thing. reply 1, 2, or 3. shows up here in 30s.<br/>
              or tap + add reel above.
            </p>
            <Squiggle color={C.purple} w={100}/>
            <button onClick={()=>setAdd(true)} style={{
              padding:"10px 24px",borderRadius:20,border:"none",
              background:`linear-gradient(135deg,${C.pink},${C.purple})`,
              color:"#fff",fontWeight:700,fontSize:14,
            }}>+ save first reel</button>
          </div>
        )}

        {reels.length>0&&view==="all"      &&<AllView      reels={reels} onStatus={setStatus} onDelete={delReel}/>}
        {reels.length>0&&view==="creators"  &&<CreatorView  reels={reels} onStatus={setStatus} onDelete={delReel}/>}
        {view==="reminders"                 &&<RemindersView reels={reels} onStatus={setStatus} onDelete={delReel}/>}
      </div>
    </div>
  );
}
