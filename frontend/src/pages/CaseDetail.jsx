import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const THEMES = {
  dark: {
    bgBase:"#0b0e17", bgCard:"#141927", bgCardHover:"#1a2236",
    border:"#222d42", textPrimary:"#e2e8f5", textSecond:"#7b8db0",
    textMuted:"#637fae", accent:"#4f8ef7", green:"#34d399",
    red:"#f87171", yellow:"#f5c842", purple:"#a78bfa",
    shadow:"0 4px 24px rgba(0,0,0,0.4)", toggleBg:"#1a2236",
  },
  light: {
    bgBase:"#eef2fb", bgCard:"#ffffff", bgCardHover:"#f5f8ff",
    border:"#d2ddf0", textPrimary:"#111827", textSecond:"#4b5e80",
    textMuted:"#434c5c", accent:"#2563eb", green:"#059669",
    red:"#dc2626", yellow:"#d97706", purple:"#7c3aed",
    shadow:"0 4px 20px rgba(20,40,100,0.10)", toggleBg:"#e2e8f7",
  },
};

const STAGE = {
  UI:{ label:"Under Investigation",        color:"#f5c842" },
  PT:{ label:"Pending Trial",              color:"#a78bfa" },
  HC:{ label:"Pending before High Court",  color:"#fb923c" },
  SC:{ label:"Pending before Supreme Court", color:"#f87171" },
  CC:{ label:"Case Closed",               color:"#34d399" },
};

function StageBadge({ code }) {
  const s = STAGE[code] || { label:code, color:"#8896b3" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 14px", borderRadius:20, fontSize:"0.75rem", fontWeight:600, fontFamily:"'Sora',sans-serif", background:`${s.color}1a`, color:s.color, border:`1px solid ${s.color}44` }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:s.color, display:"inline-block", animation:code!=="CC"?"cPulse 2s infinite":"none" }} />
      {s.label}
    </span>
  );
}

function Field({ label, value, t }) {
  return (
    <div style={{ marginBottom:"1rem" }}>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.63rem", textTransform:"uppercase", letterSpacing:"0.1em", color:t.textMuted, marginBottom:4 }}>{label}</div>
      <div style={{ fontFamily:"'Sora',sans-serif", fontSize:"0.9rem", color:t.textPrimary, lineHeight:1.6 }}>{value || <span style={{ color:t.textMuted, fontStyle:"italic" }}>—</span>}</div>
    </div>
  );
}

function Btn({ children, onClick, t, accent, outline=false, disabled=false, small=false }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>!disabled&&setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:small?"0.68rem":"0.75rem", fontWeight:600, cursor:disabled?"not-allowed":"pointer", borderRadius:8, padding:small?"5px 12px":"8px 18px", transition:"all .2s", opacity:disabled?0.45:1, background:outline?"transparent":hov?accent:`${accent}18`, border:`1px solid ${hov&&!disabled?accent:outline?t.border:`${accent}44`}`, color:outline?(hov?t.red:t.textSecond):(hov?"#fff":accent) }}>
      {children}
    </button>
  );
}

// Officer avatar pill
function OfficerPill({ officer, t, isCurrent=false }) {
  const [imgErr, setImgErr] = useState(false);
  const name = officer.first_name ? `${officer.first_name} ${officer.last_name}`.trim() : officer.username;
  const initials = (officer.username||"?").slice(0,2).toUpperCase();
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:12, background:isCurrent?`${t.accent}12`:`${t.purple}0a`, border:`1px solid ${isCurrent?t.accent+"44":t.border}`, marginBottom:8 }}>
      <div style={{ width:36, height:36, borderRadius:"50%", overflow:"hidden", flexShrink:0, background:`${isCurrent?t.accent:t.purple}22`, border:`2px solid ${isCurrent?t.accent:t.purple}44`, display:"flex", alignItems:"center", justifyContent:"center" }}>
        {officer.photo_url && !imgErr
          ? <img src={officer.photo_url} alt={name} onError={()=>setImgErr(true)} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          : <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.7rem", fontWeight:700, color:isCurrent?t.accent:t.purple }}>{initials}</span>
        }
      </div>
      <div>
        <div style={{ fontFamily:"'Sora',sans-serif", fontSize:"0.82rem", fontWeight:600, color:t.textPrimary }}>{name}</div>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.63rem", color:t.textMuted }}>{officer.branch} {isCurrent && <span style={{ color:t.accent }}>· Current Holder</span>}</div>
      </div>
    </div>
  );
}

function CaseDetail() {
  const getTheme = () => {
    try { return localStorage.getItem("coats-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); }
    catch { return "dark"; }
  };

  const { id }   = useParams();
  const navigate = useNavigate();
  const role     = localStorage.getItem("role");

  const [theme, setTheme]         = useState(getTheme);
  const [caseData, setCaseData]   = useState(null);
  const [form, setForm]           = useState({ 
    current_stage: "", 
    action_to_be_taken: "", 
    forensic_evidences: "", 
    major_improvements: "" 
  });
  const [error, setError]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [reportProgress, setReportProgress] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Handover state
  const [officers, setOfficers]         = useState([]);
  const [handoverTo, setHandoverTo]     = useState("");
  const [handoverReason, setHandoverReason] = useState("");
  const [handoverLoading, setHandoverLoading] = useState(false);
  const [handoverMsg, setHandoverMsg]   = useState("");
  const [handoverErr, setHandoverErr]   = useState("");
  const [showHandover, setShowHandover] = useState(false);

  const t      = THEMES[theme];
  const isDark = theme === "dark";

  const toggleTheme = () => setTheme(prev => {
    const next = prev === "dark" ? "light" : "dark";
    try { localStorage.setItem("coats-theme", next); } catch {}
    return next;
  });

  const token = localStorage.getItem("access");

  useEffect(() => {
    fetch(`http://127.0.0.1:8002/api/cases/${id}/`, { headers:{ Authorization:`Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error("Failed to load case"); return r.json(); })
      .then(data => {
        setCaseData(data);
        setForm({ 
          current_stage: data.current_stage || "", 
          action_to_be_taken: data.action_to_be_taken || "",
          forensic_evidences: data.forensic_evidences || "",
          major_improvements: data.major_improvements || ""
        });
      })
      .catch(err => setError(err.message));

    if (role === "SUPERVISOR") {
      fetch("http://127.0.0.1:8002/api/officers/", { headers:{ Authorization:`Bearer ${token}` } })
        .then(r => r.json()).then(setOfficers).catch(()=>{});
    }
  }, [id]);

  const isClosed = caseData?.current_stage === "CC";
  const canEdit  = role === "CASE" && !isClosed;
  const isCurrentHolder = caseData?.current_officer_detail?.username === localStorage.getItem("username");

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`http://127.0.0.1:8002/api/cases/${id}/`, {
        method:"PATCH",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Update failed");
      setSaved(true);
      setTimeout(()=>navigate("/cases"), 1200);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleExportPDF = async () => {
    setGeneratingPDF(true);
    try {
      // Fetch progress entries to include in the monthly report
      const res = await fetch(`http://127.0.0.1:8002/api/cases/${id}/progress/`, {
         headers:{ Authorization:`Bearer ${token}` }
      });
      const progressData = await res.json();
      setReportProgress(progressData);
      
      // Let React render the hidden template
      setTimeout(async () => {
        const element = document.getElementById("official-pdf-template");
        if (!element) return;
        
        const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`COATS_Official_Report_${caseData?.crime_number || id}.pdf`);
        
        setGeneratingPDF(false);
        setReportProgress(null);
      }, 500);
    } catch (err) {
      console.error("PDF Export failed:", err);
      alert("Failed to export PDF.");
      setGeneratingPDF(false);
    }
  };

  const handleHandover = async () => {
    if (!handoverTo) { setHandoverErr("Select an officer to hand over to."); return; }
    setHandoverLoading(true); setHandoverErr(""); setHandoverMsg("");
    try {
      const res = await fetch(`http://127.0.0.1:8002/api/cases/${id}/handover/`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify({ to_officer_username: handoverTo, reason: handoverReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.to_officer_username || data.detail || "Handover failed");
      setHandoverMsg(data.detail);
      setShowHandover(false);
      // Refresh case
      const fresh = await fetch(`http://127.0.0.1:8002/api/cases/${id}/`, { headers:{ Authorization:`Bearer ${token}` } });
      setCaseData(await fresh.json());
    } catch (err) { setHandoverErr(err.message); }
    finally { setHandoverLoading(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Sora:wght@300;400;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        @keyframes cPulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.75)} }
        @keyframes cFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        textarea:focus, select:focus { outline:none; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-thumb { background:${t.border}; border-radius:3px; }
      `}</style>

      <div style={{ fontFamily:"'Sora',sans-serif", background:t.bgBase, color:t.textPrimary, minHeight:"100vh", padding:"2rem", transition:"background .25s, color .2s" }}>

        {/* HEADER */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"2rem" }}>
          <div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.67rem", color:t.textMuted, textTransform:"uppercase", letterSpacing:"0.13em", marginBottom:6 }}>🚔 COATS · Case Detail</div>
            <h1 style={{ fontSize:"1.65rem", fontWeight:700, letterSpacing:"-0.025em", lineHeight:1.2 }}>{caseData ? caseData.crime_number : "Loading…"}</h1>
            {caseData && <div style={{ marginTop:8 }}><StageBadge code={caseData.current_stage} /></div>}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.7rem", color:t.textSecond }}>{isDark?"Dark":"Light"}</span>
              <div onClick={toggleTheme} style={{ background:t.toggleBg, border:`1px solid ${t.border}`, borderRadius:50, width:62, height:30, position:"relative", cursor:"pointer" }}>
                <div style={{ position:"absolute", width:22, height:22, borderRadius:"50%", background:t.accent, top:"50%", transform:`translateY(-50%) translateX(${isDark?4:36}px)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, transition:"transform .3s cubic-bezier(.34,1.56,.64,1)" }}>{isDark?"🌙":"☀️"}</div>
              </div>
            </div>
            <Btn onClick={handleExportPDF} t={t} accent={t.accent} outline disabled={generatingPDF}>
              {generatingPDF ? "Generating PDF..." : "📄 Export PDF Report"}
            </Btn>
            <Btn onClick={()=>navigate("/cases")} t={t} accent={t.accent} outline>← Back</Btn>
          </div>
        </div>

        {/* MESSAGES */}
        {error && <div style={{ background:`${t.red}15`, border:`1px solid ${t.red}44`, borderRadius:10, padding:"10px 16px", marginBottom:"1.5rem", fontFamily:"'JetBrains Mono',monospace", fontSize:"0.78rem", color:t.red }}>⚠️ {error}</div>}
        {saved && <div style={{ background:`${t.green}15`, border:`1px solid ${t.green}44`, borderRadius:10, padding:"10px 16px", marginBottom:"1.5rem", fontFamily:"'JetBrains Mono',monospace", fontSize:"0.78rem", color:t.green }}>✅ Case updated. Redirecting…</div>}
        {handoverMsg && <div style={{ background:`${t.green}15`, border:`1px solid ${t.green}44`, borderRadius:10, padding:"10px 16px", marginBottom:"1.5rem", fontFamily:"'JetBrains Mono',monospace", fontSize:"0.78rem", color:t.green }}>✅ {handoverMsg}</div>}

        {!caseData && !error && (
          <div style={{ textAlign:"center", padding:"4rem", color:t.textMuted, fontFamily:"'JetBrains Mono',monospace" }}>
            <div style={{ fontSize:"1.5rem", marginBottom:10, opacity:0.3 }}>⏳</div>Loading case details…
          </div>
        )}

        {caseData && (
          <div id="case-detail-content" style={{ animation:"cFadeIn .35s ease", paddingBottom:"10px" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem", marginBottom:"1.5rem" }}>

              {/* CASE INFO */}
              <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:"1.5rem", boxShadow:t.shadow }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.67rem", textTransform:"uppercase", letterSpacing:"0.12em", color:t.textMuted, marginBottom:"1.25rem" }}>Case Information</div>
                <Field label="Branch"              value={caseData.branch}            t={t} />
                <Field label="PS Limit"            value={caseData.ps_limit}          t={t} />
                <Field label="Crime No."           value={caseData.crime_number}      t={t} />
                <Field label="IPC Section"         value={caseData.section_of_law}    t={t} />
                <Field label="Date of Occurrence"  value={caseData.date_of_occurrence}   t={t} />
                <Field label="Date of Registration" value={caseData.date_of_registration} t={t} />
              </div>

              {/* PARTIES */}
              <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:"1.5rem", boxShadow:t.shadow }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.67rem", textTransform:"uppercase", letterSpacing:"0.12em", color:t.textMuted, marginBottom:"1.25rem" }}>Parties & Gist</div>
                <Field label="Complainant"     value={caseData.complainant_name}  t={t} />
                <Field label="Accused Details" value={caseData.accused_details}   t={t} />
                <Field label="Gist of Case"    value={caseData.gist_of_case}      t={t} />
              </div>
            </div>

            {/* OFFICERS CARD */}
            <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:"1.5rem", boxShadow:t.shadow, marginBottom:"1.5rem" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.25rem" }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.67rem", textTransform:"uppercase", letterSpacing:"0.12em", color:t.textMuted }}>
                  Officers · {caseData.all_officers_detail?.length || 0} involved
                </div>
                {role === "SUPERVISOR" && !isClosed && (
                  <Btn onClick={()=>setShowHandover(v=>!v)} t={t} accent={t.yellow} small>
                    {showHandover ? "✕ Cancel" : "🔄 Handover Case"}
                  </Btn>
                )}
              </div>

              {/* Officer pills */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:8, marginBottom:showHandover?16:0 }}>
                {caseData.current_officer_detail && (
                  <OfficerPill officer={caseData.current_officer_detail} t={t} isCurrent />
                )}
                {(caseData.all_officers_detail||[])
                  .filter(o => o.username !== caseData.current_officer_detail?.username)
                  .map(o => <OfficerPill key={o.id} officer={o} t={t} />)
                }
                {!caseData.current_officer_detail && (
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.75rem", color:t.textMuted, padding:"8px 0" }}>No officer assigned yet.</div>
                )}
              </div>

              {/* Handover panel */}
              {showHandover && role === "SUPERVISOR" && (
                <div style={{ borderTop:`1px solid ${t.border}`, paddingTop:16, animation:"cFadeIn .25s ease" }}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.67rem", textTransform:"uppercase", letterSpacing:"0.1em", color:t.yellow, marginBottom:10 }}>
                    🔄 Authorize Case Handover
                  </div>
                  {handoverErr && <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.72rem", color:t.red, marginBottom:8 }}>⚠ {handoverErr}</div>}

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                    <div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.63rem", textTransform:"uppercase", color:t.textMuted, marginBottom:5 }}>Hand Over To</div>
                      <select value={handoverTo} onChange={e=>setHandoverTo(e.target.value)}
                        style={{ width:"100%", padding:"0.6rem 0.9rem", background:t.bgBase, border:`1px solid ${t.border}`, borderRadius:9, color:t.textPrimary, fontFamily:"'JetBrains Mono',monospace", fontSize:"0.8rem" }}>
                        <option value="">— Select officer —</option>
                        {officers
                          .filter(o => o.username !== caseData.current_officer_detail?.username)
                          .map(o => (
                            <option key={o.id} value={o.username}>
                              {o.first_name ? `${o.first_name} ${o.last_name} (${o.username})` : o.username} · {o.branch}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                    <div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.63rem", textTransform:"uppercase", color:t.textMuted, marginBottom:5 }}>Reason (optional)</div>
                      <input value={handoverReason} onChange={e=>setHandoverReason(e.target.value)} placeholder="Transfer reason..."
                        style={{ width:"100%", padding:"0.6rem 0.9rem", background:t.bgBase, border:`1px solid ${t.border}`, borderRadius:9, color:t.textPrimary, fontFamily:"'Sora',sans-serif", fontSize:"0.82rem" }} />
                    </div>
                  </div>

                  {/* Preview: from → to */}
                  {handoverTo && (
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12, padding:"10px 14px", background:`${t.yellow}08`, border:`1px solid ${t.yellow}33`, borderRadius:10 }}>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.72rem", color:t.textSecond }}>
                        From: <b style={{ color:t.red }}>{caseData.current_officer_detail?.username || "unassigned"}</b>
                      </span>
                      <span style={{ color:t.textMuted }}>→</span>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.72rem", color:t.textSecond }}>
                        To: <b style={{ color:t.green }}>{handoverTo}</b>
                      </span>
                    </div>
                  )}

                  <Btn onClick={handleHandover} t={t} accent={t.yellow} disabled={handoverLoading||!handoverTo}>
                    {handoverLoading ? "Processing…" : "✓ Confirm Handover"}
                  </Btn>
                </div>
              )}
            </div>

            {/* UPDATE CARD */}
            <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:"1.5rem", boxShadow:t.shadow }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.67rem", textTransform:"uppercase", letterSpacing:"0.12em", color:t.textMuted, marginBottom:"1.25rem", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span>Case Status & Action</span>
                {isClosed && <span style={{ background:`${t.green}18`, color:t.green, border:`1px solid ${t.green}44`, borderRadius:20, padding:"2px 10px", fontSize:"0.68rem" }}>🔒 Closed — Read Only</span>}
                {role === "SUPERVISOR" && !isClosed && <span style={{ background:`${t.yellow}18`, color:t.yellow, border:`1px solid ${t.yellow}44`, borderRadius:20, padding:"2px 10px", fontSize:"0.68rem" }}>👁 Supervisor View — Read Only</span>}
                {role === "CASE" && !isCurrentHolder && !isClosed && <span style={{ background:`${t.red}18`, color:t.red, border:`1px solid ${t.red}44`, borderRadius:20, padding:"2px 10px", fontSize:"0.68rem" }}>⚠ You are not the current holder</span>}
              </div>

              <div style={{ marginBottom:"1.25rem" }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.63rem", textTransform:"uppercase", letterSpacing:"0.1em", color:t.textMuted, marginBottom:6 }}>Current Stage</div>
                <select name="current_stage" value={form.current_stage} onChange={e=>setForm({...form, current_stage:e.target.value})} disabled={!canEdit}
                  style={{ width:"100%", padding:"0.65rem 1rem", background:canEdit?t.bgBase:t.bgCardHover, border:`1px solid ${t.border}`, borderRadius:10, color:canEdit?t.textPrimary:t.textMuted, fontFamily:"'JetBrains Mono',monospace", fontSize:"0.82rem", cursor:canEdit?"pointer":"not-allowed" }}>
                  {Object.entries(STAGE).map(([code,s])=><option key={code} value={code}>{s.label}</option>)}
                </select>
              </div>

              <div style={{ marginBottom:"1.5rem" }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.63rem", textTransform:"uppercase", letterSpacing:"0.1em", color:t.textMuted, marginBottom:6 }}>Action to be Taken</div>
                <textarea name="action_to_be_taken" value={form.action_to_be_taken} onChange={e=>setForm({...form, action_to_be_taken:e.target.value})} disabled={!canEdit} rows={4}
                  style={{ width:"100%", padding:"0.75rem 1rem", background:canEdit?t.bgBase:t.bgCardHover, border:`1px solid ${t.border}`, borderRadius:10, color:canEdit?t.textPrimary:t.textMuted, fontFamily:"'Sora',sans-serif", fontSize:"0.88rem", resize:"vertical", lineHeight:1.6, cursor:canEdit?"text":"not-allowed" }} />
              </div>

              <div style={{ marginBottom:"1.5rem" }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.63rem", textTransform:"uppercase", letterSpacing:"0.1em", color:t.textMuted, marginBottom:6 }}>Forensic Evidences / Material Recoveries</div>
                <textarea name="forensic_evidences" value={form.forensic_evidences} onChange={e=>setForm({...form, forensic_evidences:e.target.value})} disabled={!canEdit} rows={3} placeholder="List all forensics..."
                  style={{ width:"100%", padding:"0.75rem 1rem", background:canEdit?t.bgBase:t.bgCardHover, border:`1px solid ${t.border}`, borderRadius:10, color:canEdit?t.textPrimary:t.textMuted, fontFamily:"'Sora',sans-serif", fontSize:"0.88rem", resize:"vertical", lineHeight:1.6, cursor:canEdit?"text":"not-allowed" }} />
              </div>

              <div style={{ marginBottom:"1.5rem" }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.63rem", textTransform:"uppercase", letterSpacing:"0.1em", color:t.textMuted, marginBottom:6 }}>Major Investigative Improvements / Findings</div>
                <textarea name="major_improvements" value={form.major_improvements} onChange={e=>setForm({...form, major_improvements:e.target.value})} disabled={!canEdit} rows={3} placeholder="Summarize key case improvements..."
                  style={{ width:"100%", padding:"0.75rem 1rem", background:canEdit?t.bgBase:t.bgCardHover, border:`1px solid ${t.border}`, borderRadius:10, color:canEdit?t.textPrimary:t.textMuted, fontFamily:"'Sora',sans-serif", fontSize:"0.88rem", resize:"vertical", lineHeight:1.6, cursor:canEdit?"text":"not-allowed" }} />
              </div>

              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {canEdit && (
                  <Btn onClick={handleUpdate} t={t} accent={t.green} disabled={saving}>
                    {saving ? "Saving…" : "✓ Update Case"}
                  </Btn>
                )}
                <Btn onClick={()=>navigate(`/cases/${id}/custody`)} t={t} accent={t.purple}>🔗 Chain of Custody</Btn>
                {role === "CASE" && !isClosed && (
                  <Btn onClick={()=>navigate(`/cases/${id}/progress`)} t={t} accent={t.green}>📝 Progress Updation</Btn>
                )}
                <Btn onClick={()=>navigate("/cases")} t={t} accent={t.accent} outline>← Back to Cases</Btn>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* HIDDEN PDF TEMPLATE FOR "MONTHLY REPORT" A4 SIZE FORMAT */}
      <div style={{ position:"absolute", left:"-9999px", top:0 }}>
        <div id="official-pdf-template" style={{ width:"794px", minHeight:"1123px", padding:"40px", background:"#fff", color:"#000", fontFamily:"'Times New Roman', serif" }}>
          
          {/* Header */}
          <div style={{ textAlign:"center", borderBottom:"2px solid #000", paddingBottom:"15px", marginBottom:"20px" }}>
            <h2 style={{ margin:0, fontSize:"24px", fontWeight:"bold", textTransform:"uppercase" }}>ANTI-TERRORISM SQUAD</h2>
            <h3 style={{ margin:"5px 0", fontSize:"18px", fontWeight:"normal" }}>OFFICIAL CASE INVESTIGATION REPORT</h3>
            <div style={{ fontSize:"12px", letterSpacing:"1px", color:"#555" }}>STRICTLY CONFIDENTIAL</div>
          </div>
          
          {/* Meta */}
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"20px", fontSize:"14px" }}>
            <div><strong>Date of Report:</strong> {new Date().toLocaleDateString('en-GB')}</div>
            <div><strong>Branch:</strong> {caseData?.branch}</div>
          </div>

          {/* Section 1: Details */}
          <div style={{ marginBottom:"20px" }}>
            <h4 style={{ margin:"0 0 10px 0", fontSize:"16px", backgroundColor:"#f0f0f0", padding:"5px", border:"1px solid #ccc" }}>1. CASE DETAILS</h4>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"14px" }}>
              <tbody>
                <tr><td style={{ border:"1px solid #ccc", padding:"6px", width:"25%" }}><strong>Crime No:</strong></td><td style={{ border:"1px solid #ccc", padding:"6px" }}>{caseData?.crime_number}</td></tr>
                <tr><td style={{ border:"1px solid #ccc", padding:"6px" }}><strong>Sections of Law:</strong></td><td style={{ border:"1px solid #ccc", padding:"6px" }}>{caseData?.section_of_law}</td></tr>
                <tr><td style={{ border:"1px solid #ccc", padding:"6px" }}><strong>PS Limit:</strong></td><td style={{ border:"1px solid #ccc", padding:"6px" }}>{caseData?.ps_limit}</td></tr>
                <tr><td style={{ border:"1px solid #ccc", padding:"6px" }}><strong>Complainant:</strong></td><td style={{ border:"1px solid #ccc", padding:"6px", whiteSpace:"pre-wrap" }}>{caseData?.complainant_name}</td></tr>
                <tr><td style={{ border:"1px solid #ccc", padding:"6px" }}><strong>Accused Details:</strong></td><td style={{ border:"1px solid #ccc", padding:"6px", whiteSpace:"pre-wrap" }}>{caseData?.accused_details}</td></tr>
                <tr><td style={{ border:"1px solid #ccc", padding:"6px" }}><strong>Current Stage:</strong></td><td style={{ border:"1px solid #ccc", padding:"6px" }}>{STAGE[caseData?.current_stage]?.label}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Gist */}
          <div style={{ marginBottom:"20px" }}>
            <h4 style={{ margin:"0 0 10px 0", fontSize:"16px", backgroundColor:"#f0f0f0", padding:"5px", border:"1px solid #ccc" }}>2. GIST OF THE CASE</h4>
            <p style={{ fontSize:"14px", lineHeight:"1.5", textAlign:"justify", whiteSpace:"pre-wrap" }}>{caseData?.gist_of_case}</p>
          </div>

          {/* Section 3: Forensics & Improvements */}
          <div style={{ marginBottom:"20px" }}>
            <h4 style={{ margin:"0 0 10px 0", fontSize:"16px", backgroundColor:"#f0f0f0", padding:"5px", border:"1px solid #ccc" }}>3. FORENSIC EVIDENCES & MATERIAL RECOVERIES</h4>
            <p style={{ fontSize:"14px", lineHeight:"1.5", textAlign:"justify", whiteSpace:"pre-wrap" }}>{form.forensic_evidences || "Nil reported."}</p>
          </div>
          
          <div style={{ marginBottom:"20px" }}>
            <h4 style={{ margin:"0 0 10px 0", fontSize:"16px", backgroundColor:"#f0f0f0", padding:"5px", border:"1px solid #ccc" }}>4. MAJOR INVESTIGATIVE FINDINGS</h4>
            <p style={{ fontSize:"14px", lineHeight:"1.5", textAlign:"justify", whiteSpace:"pre-wrap" }}>{form.major_improvements || "Nil reported."}</p>
          </div>

          {/* Section 4: Progress Log */}
          {reportProgress && (
            <div>
              <h4 style={{ margin:"0 0 10px 0", fontSize:"16px", backgroundColor:"#f0f0f0", padding:"5px", border:"1px solid #ccc" }}>5. INVESTIGATION PROGRESS TIMELINE</h4>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px" }}>
                <thead>
                  <tr style={{ backgroundColor:"#eee" }}>
                    <th style={{ border:"1px solid #000", padding:"6px", textAlign:"left", width:"15%" }}>Date</th>
                    <th style={{ border:"1px solid #000", padding:"6px", textAlign:"left", width:"20%" }}>Officer</th>
                    <th style={{ border:"1px solid #000", padding:"6px", textAlign:"left" }}>Details of Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {reportProgress.length === 0 ? (
                    <tr><td colSpan={3} style={{ border:"1px solid #000", padding:"6px", textAlign:"center" }}>No progress logged yet.</td></tr>
                  ) : reportProgress.map(p => (
                    <tr key={p.id}>
                      <td style={{ border:"1px solid #000", padding:"6px" }}>{p.date_of_progress}</td>
                      <td style={{ border:"1px solid #000", padding:"6px" }}>{p.officer_username}</td>
                      <td style={{ border:"1px solid #000", padding:"6px", whiteSpace:"pre-wrap" }}>{p.details_of_progress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signature */}
          <div style={{ marginTop:"60px", display:"flex", justifyContent:"flex-end" }}>
            <div style={{ textAlign:"center", width:"250px" }}>
              <div style={{ borderBottom:"1px solid #000", marginBottom:"5px", height:"40px" }}></div>
              <div><strong>{caseData?.current_officer_detail?.username || "Authorized Signatory"}</strong></div>
              <div style={{ fontSize:"12px" }}>Case Holding Officer</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default CaseDetail;
