import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const THEMES = {
  dark:  { bgBase:"#0b0e17", bgCard:"#141927", bgCardHover:"#1a2236", border:"#222d42", textPrimary:"#e2e8f5", textSecond:"#7b8db0", textMuted:"#3d4f6e", accent:"#4f8ef7", green:"#34d399", red:"#f87171", yellow:"#f5c842", purple:"#a78bfa", shadow:"0 4px 24px rgba(0,0,0,0.4)", toggleBg:"#1a2236" },
  light: { bgBase:"#eef2fb", bgCard:"#ffffff", bgCardHover:"#f5f8ff", border:"#d2ddf0", textPrimary:"#111827", textSecond:"#4b5e80", textMuted:"#96a8c8", accent:"#2563eb", green:"#059669", red:"#dc2626", yellow:"#d97706", purple:"#7c3aed", shadow:"0 4px 20px rgba(20,40,100,0.10)", toggleBg:"#e2e8f7" },
};

const FIELD_META = {
  current_stage:      { label:"Stage Change",       icon:"🔄", color:"purple" },
  action_to_be_taken: { label:"Action Updated",     icon:"📝", color:"accent" },
  section_of_law:     { label:"IPC Section Edited", icon:"⚖️", color:"yellow" },
  complainant_name:   { label:"Complainant Edited", icon:"👤", color:"accent" },
  accused_details:    { label:"Accused Edited",     icon:"🔎", color:"accent" },
  gist_of_case:       { label:"Case Gist Edited",   icon:"📄", color:"accent" },
  ps_limit:           { label:"PS Limit Changed",   icon:"📍", color:"yellow" },
  HANDOVER:           { label:"Case Handover",      icon:"🔄", color:"yellow" },
};

const STAGE_LABEL = { UI:"Under Investigation", PT:"Pending Trial", HC:"Pending before HC", SC:"Pending before SC", CC:"Closed" };

function OfficerAvatar({ name, photoUrl, t, size=44, colorKey="accent" }) {
  const [imgErr, setImgErr] = useState(false);
  const initials = (name||"?").split(/[\s._]/).map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const color = t[colorKey] || t.accent;
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", border:`2px solid ${color}44`, overflow:"hidden", flexShrink:0, background:`${color}22`, display:"flex", alignItems:"center", justifyContent:"center" }}>
      {photoUrl && !imgErr
        ? <img src={photoUrl} alt={name} onError={()=>setImgErr(true)} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
        : <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:size*0.32, fontWeight:700, color }}>{initials}</span>
      }
    </div>
  );
}

function OfficerRosterCard({ officers, currentOfficer, t }) {
  return (
    <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"1.25rem", marginBottom:"1.5rem" }}>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.63rem", textTransform:"uppercase", letterSpacing:"0.1em", color:t.textMuted, marginBottom:12 }}>
        👮 All Officers · {officers.length} involved
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
        {officers.map((o, i) => {
          const isCurr = o.username === currentOfficer?.username;
          const [err, setErr] = useState(false);
          const displayName = o.first_name ? `${o.first_name} ${o.last_name}`.trim() : o.username;
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 12px", borderRadius:30, background:isCurr?`${t.accent}14`:`${t.purple}0a`, border:`1px solid ${isCurr?t.accent+"44":t.border}` }}>
              <div style={{ width:28, height:28, borderRadius:"50%", overflow:"hidden", background:`${isCurr?t.accent:t.purple}22`, border:`2px solid ${isCurr?t.accent:t.purple}44`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {o.photo_url && !err
                  ? <img src={o.photo_url} alt={displayName} onError={()=>setErr(true)} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  : <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.6rem", fontWeight:700, color:isCurr?t.accent:t.purple }}>{o.username.slice(0,2).toUpperCase()}</span>
                }
              </div>
              <div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:"0.78rem", fontWeight:600, color:t.textPrimary }}>{displayName}</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.58rem", color:t.textMuted }}>
                  {o.branch}{isCurr && <span style={{ color:t.accent }}> · Current</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CustodyBlock({ log, t, isLast, blockValid, index }) {
  const [expanded, setExpanded] = useState(log.field_changed === "HANDOVER");
  const meta  = FIELD_META[log.field_changed] || { label:log.field_changed, icon:"✏️", color:"accent" };
  const color = t[meta.color] || t.accent;
  const isHandover = log.field_changed === "HANDOVER";
  const isStage    = log.field_changed === "current_stage";
  const isOk = blockValid !== false;

  return (
    <div style={{ display:"flex", gap:"1.5rem", animation:"cFadeUp .35s ease both", animationDelay:`${index*55}ms` }}>
      {/* Spine */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0, width:44 }}>
        <OfficerAvatar name={log.updated_by} photoUrl={log.officer_photo} t={t} size={44} colorKey={meta.color} />
        {!isLast && <div style={{ width:2, flex:1, minHeight:28, background:`linear-gradient(to bottom,${color}66,${t.border})`, margin:"4px 0" }} />}
      </div>

      {/* Card */}
      <div style={{ flex:1, marginBottom:isLast?0:"1rem" }}>
        <div onClick={()=>setExpanded(e=>!e)} style={{ background:isHandover?`${t.yellow}08`:t.bgCard, border:`1px solid ${isHandover?t.yellow+"55":isOk?t.border:t.red+"88"}`, borderRadius:14, padding:"0.9rem 1.2rem", cursor:"pointer", transition:"all .2s" }}
          onMouseEnter={e=>e.currentTarget.style.borderColor=isHandover?t.yellow:color+"88"}
          onMouseLeave={e=>e.currentTarget.style.borderColor=isHandover?t.yellow+"55":isOk?t.border:t.red+"88"}>

          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:"1rem" }}>{meta.icon}</span>
              <div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:"0.86rem", fontWeight:600, color:isHandover?t.yellow:t.textPrimary }}>{meta.label}</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.65rem", color:t.textMuted, marginTop:2 }}>
                  by <span style={{ color }}>{log.updated_by}</span> · {log.branch} · {new Date(log.timestamp).toLocaleString("en-IN")}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.6rem", padding:"2px 7px", borderRadius:20, background:isOk?`${t.green}18`:`${t.red}18`, color:isOk?t.green:t.red, border:`1px solid ${isOk?t.green:t.red}44` }}>
                {isOk?"✓ Verified":"⚠ Tampered"}
              </span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.62rem", color:t.textMuted }}>#{log.block_index}</span>
              <span style={{ color:t.textMuted, fontSize:"0.75rem", transform:expanded?"rotate(90deg)":"rotate(0)", transition:"transform .2s" }}>›</span>
            </div>
          </div>

          {/* Handover preview */}
          {isHandover && (
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.72rem", padding:"3px 10px", borderRadius:20, background:`${t.red}15`, color:t.red, border:`1px solid ${t.red}33` }}>
                👮 {log.old_value || "unassigned"}
              </span>
              <span style={{ color:t.textMuted }}>→</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.72rem", padding:"3px 10px", borderRadius:20, background:`${t.green}15`, color:t.green, border:`1px solid ${t.green}33` }}>
                👮 {log.new_value}
              </span>
            </div>
          )}

          {/* Stage change preview */}
          {isStage && (
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.68rem", padding:"2px 8px", borderRadius:20, background:`${t.red}15`, color:t.red, border:`1px solid ${t.red}33` }}>{STAGE_LABEL[log.old_value]||log.old_value}</span>
              <span style={{ color:t.textMuted }}>→</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.68rem", padding:"2px 8px", borderRadius:20, background:`${t.green}15`, color:t.green, border:`1px solid ${t.green}33` }}>{STAGE_LABEL[log.new_value]||log.new_value}</span>
            </div>
          )}
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div style={{ background:`${t.accent}07`, border:`1px solid ${t.border}`, borderTop:"none", borderRadius:"0 0 14px 14px", padding:"1rem 1.2rem" }}>
            {!isHandover && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem", marginBottom:"0.75rem" }}>
                <div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.58rem", textTransform:"uppercase", letterSpacing:"0.1em", color:t.textMuted, marginBottom:4 }}>Previous Value</div>
                  <div style={{ fontFamily:"'Sora',sans-serif", fontSize:"0.8rem", color:t.red, background:`${t.red}0d`, border:`1px solid ${t.red}22`, borderRadius:8, padding:"6px 10px", whiteSpace:"pre-wrap", minHeight:32 }}>{log.old_value||"—"}</div>
                </div>
                <div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.58rem", textTransform:"uppercase", letterSpacing:"0.1em", color:t.textMuted, marginBottom:4 }}>New Value</div>
                  <div style={{ fontFamily:"'Sora',sans-serif", fontSize:"0.8rem", color:t.green, background:`${t.green}0d`, border:`1px solid ${t.green}22`, borderRadius:8, padding:"6px 10px", whiteSpace:"pre-wrap", minHeight:32 }}>{log.new_value||"—"}</div>
                </div>
              </div>
            )}
            <div style={{ borderTop:`1px solid ${t.border}`, paddingTop:"0.75rem" }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.58rem", textTransform:"uppercase", letterSpacing:"0.1em", color:t.textMuted, marginBottom:6 }}>🔗 Block Hash Chain</div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.63rem", display:"flex", gap:8 }}>
                  <span style={{ color:t.textMuted, minWidth:80 }}>prev_hash</span>
                  <span style={{ color:t.purple, wordBreak:"break-all" }}>{log.prev_hash}</span>
                </div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.63rem", display:"flex", gap:8 }}>
                  <span style={{ color:t.textMuted, minWidth:80 }}>block_hash</span>
                  <span style={{ color:t.accent, wordBreak:"break-all" }}>{log.block_hash}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChainOfCustody() {
  const getTheme = () => {
    try { return localStorage.getItem("coats-theme")||(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"); }
    catch { return "dark"; }
  };

  const { id }  = useParams();
  const navigate = useNavigate();
  const [theme, setTheme]     = useState(getTheme);
  const [custody, setCustody] = useState(null);
  const [verify,  setVerify]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const t = THEMES[theme];
  const isDark = theme === "dark";

  const toggleTheme = () => setTheme(prev => {
    const next = prev==="dark"?"light":"dark";
    try { localStorage.setItem("coats-theme", next); } catch {}
    return next;
  });

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) { navigate("/login", { replace:true }); return; }
    const h = { Authorization:`Bearer ${token}` };
    const base = "http://127.0.0.1:8002/api";
    Promise.all([
      fetch(`${base}/cases/${id}/custody/`,      { headers:h }).then(r=>r.json()),
      fetch(`${base}/cases/${id}/chain-verify/`, { headers:h }).then(r=>r.json()),
    ]).then(([c, v]) => { setCustody(c); setVerify(v); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [id]);

  const blockValidity = {};
  if (verify?.blocks) verify.blocks.forEach(b => { blockValidity[b.block_index] = b.valid; });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Sora:wght@300;400;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        @keyframes cFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-thumb { background:${t.border}; border-radius:3px; }
      `}</style>

      <div style={{ fontFamily:"'Sora',sans-serif", background:t.bgBase, color:t.textPrimary, minHeight:"100vh", padding:"2rem", transition:"background .25s" }}>

        {/* HEADER */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"2rem" }}>
          <div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.67rem", color:t.textMuted, textTransform:"uppercase", letterSpacing:"0.13em", marginBottom:6 }}>🚔 COATS · Chain of Custody</div>
            <h1 style={{ fontSize:"1.65rem", fontWeight:700, letterSpacing:"-0.025em" }}>{custody ? custody.crime_number : "Loading…"}</h1>
            {custody && (
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.68rem", color:t.textMuted, marginTop:5 }}>
                {custody.total_blocks} blocks · {" "}
                <span style={{ color:verify?.chain_intact?t.green:t.red }}>
                  {verify?.chain_intact ? "✓ Chain Intact" : "⚠ Chain Compromised"}
                </span>
              </div>
            )}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.7rem", color:t.textSecond }}>{isDark?"Dark":"Light"}</span>
              <div onClick={toggleTheme} style={{ background:t.toggleBg, border:`1px solid ${t.border}`, borderRadius:50, width:62, height:30, position:"relative", cursor:"pointer" }}>
                <div style={{ position:"absolute", width:22, height:22, borderRadius:"50%", background:t.accent, top:"50%", transform:`translateY(-50%) translateX(${isDark?4:36}px)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, transition:"transform .3s cubic-bezier(.34,1.56,.64,1)" }}>{isDark?"🌙":"☀️"}</div>
              </div>
            </div>
            <button onClick={()=>navigate(`/cases/${id}`)} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.72rem", fontWeight:600, cursor:"pointer", borderRadius:8, padding:"6px 14px", background:"transparent", border:`1px solid ${t.border}`, color:t.textSecond }}>← Case Detail</button>
          </div>
        </div>

        {/* INTEGRITY BANNER */}
        {verify && (
          <div style={{ background:verify.chain_intact?`${t.green}12`:`${t.red}12`, border:`1px solid ${verify.chain_intact?t.green:t.red}44`, borderRadius:12, padding:"0.9rem 1.2rem", marginBottom:"1.5rem", display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ fontSize:"1.4rem" }}>{verify.chain_intact?"🔒":"🚨"}</div>
            <div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.78rem", fontWeight:700, color:verify.chain_intact?t.green:t.red }}>
                {verify.chain_intact ? "Blockchain Integrity Verified — All blocks intact" : "⚠ CHAIN INTEGRITY FAILED — Data may have been tampered with"}
              </div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.65rem", color:t.textMuted, marginTop:3 }}>
                {verify.total_blocks} blocks · SHA-256 hash chain · each block linked to previous
              </div>
            </div>
          </div>
        )}

        {error && <div style={{ background:`${t.red}15`, border:`1px solid ${t.red}44`, borderRadius:10, padding:"10px 16px", marginBottom:"1rem", fontFamily:"'JetBrains Mono',monospace", fontSize:"0.78rem", color:t.red }}>⚠️ {error}</div>}

        {loading ? (
          <div style={{ textAlign:"center", padding:"4rem", color:t.textMuted, fontFamily:"'JetBrains Mono',monospace" }}>
            <div style={{ fontSize:"1.5rem", marginBottom:10, opacity:0.3 }}>⏳</div>Loading custody chain…
          </div>
        ) : (
          <>
            {/* OFFICER ROSTER */}
            {custody?.all_officers?.length > 0 && (
              <OfficerRosterCard officers={custody.all_officers} currentOfficer={custody.current_officer} t={t} />
            )}

            <div style={{ maxWidth:760 }}>
              {/* Genesis */}
              <div style={{ display:"flex", gap:"1.5rem", marginBottom:"1rem", animation:"cFadeUp .3s ease" }}>
                <div style={{ width:44, display:"flex", flexDirection:"column", alignItems:"center" }}>
                  <div style={{ width:44, height:44, borderRadius:"50%", background:`${t.green}22`, border:`2px solid ${t.green}66`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem" }}>🏁</div>
                  <div style={{ width:2, height:20, background:`${t.green}44`, margin:"4px 0" }} />
                </div>
                <div style={{ flex:1, background:t.bgCard, border:`1px solid ${t.green}44`, borderRadius:14, padding:"0.85rem 1.2rem", alignSelf:"flex-start" }}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.75rem", color:t.green, fontWeight:700 }}>GENESIS — Case Created</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.64rem", color:t.textMuted, marginTop:3 }}>
                    Crime No: {custody?.crime_number} · prev_hash: <span style={{ color:t.purple }}>GENESIS</span>
                  </div>
                </div>
              </div>

              {/* Blocks */}
              {custody?.custody_chain?.length === 0 ? (
                <div style={{ textAlign:"center", padding:"3rem", color:t.textMuted, fontFamily:"'JetBrains Mono',monospace" }}>📭 No updates recorded yet.</div>
              ) : (
                custody.custody_chain.map((log, i) => (
                  <CustodyBlock key={log.id} log={log} t={t}
                    isLast={i === custody.custody_chain.length - 1}
                    blockValid={blockValidity[log.block_index]}
                    index={i}
                  />
                ))
              )}

              {/* Chain tip */}
              {custody?.custody_chain?.length > 0 && (
                <div style={{ display:"flex", gap:"1.5rem", marginTop:"1rem" }}>
                  <div style={{ width:44, display:"flex", justifyContent:"center" }}>
                    <div style={{ width:44, height:44, borderRadius:"50%", background:`${t.accent}22`, border:`2px solid ${t.accent}66`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem" }}>🔗</div>
                  </div>
                  <div style={{ flex:1, background:t.bgCard, border:`1px solid ${t.accent}44`, borderRadius:14, padding:"0.85rem 1.2rem", alignSelf:"center" }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.73rem", color:t.accent, fontWeight:700 }}>CHAIN TIP — Latest Block</div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.63rem", color:t.textMuted, marginTop:3, wordBreak:"break-all" }}>
                      hash: <span style={{ color:t.accent }}>{custody.custody_chain.at(-1)?.block_hash}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
