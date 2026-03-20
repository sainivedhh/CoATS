import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const THEMES = {
  dark:  { bgBase:"#0b0e17", bgCard:"#141927", bgCardHover:"#1a2236", border:"#222d42", textPrimary:"#e2e8f5", textSecond:"#7b8db0", textMuted:"#637fae", accent:"#4f8ef7", green:"#34d399", red:"#f87171", yellow:"#f5c842", purple:"#a78bfa", shadow:"0 4px 24px rgba(0,0,0,0.4)", toggleBg:"#1a2236" },
  light: { bgBase:"#eef2fb", bgCard:"#ffffff", bgCardHover:"#f5f8ff", border:"#d2ddf0", textPrimary:"#111827", textSecond:"#4b5e80", textMuted:"#434c5c", accent:"#2563eb", green:"#059669", red:"#dc2626", yellow:"#d97706", purple:"#7c3aed", shadow:"0 4px 20px rgba(20,40,100,0.10)", toggleBg:"#e2e8f7" },
};

function Btn({ children, onClick, t, accent, outline=false, disabled=false }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>!disabled&&setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.75rem", fontWeight:600, cursor:disabled?"not-allowed":"pointer", borderRadius:8, padding:"8px 18px", transition:"all .2s", opacity:disabled?0.45:1, background:outline?"transparent":hov?accent:`${accent}18`, border:`1px solid ${hov&&!disabled?accent:outline?t.border:`${accent}44`}`, color:outline?(hov?t.red:t.textSecond):(hov?"#fff":accent) }}>
      {children}
    </button>
  );
}

function Label({ text, t }) {
  return <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.63rem", textTransform:"uppercase", letterSpacing:"0.1em", color:t.textMuted, marginBottom:5 }}>{text}</div>;
}

function inputStyle(t) {
  return { width:"100%", padding:"0.65rem 1rem", background:t.bgBase, border:`1px solid ${t.border}`, borderRadius:9, color:t.textPrimary, fontFamily:"'Sora',sans-serif", fontSize:"0.85rem" };
}

export default function ProgressUpdate() {
  const getTheme = () => { try { return localStorage.getItem("coats-theme")||(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"); } catch { return "dark"; }};
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("access");
  const BASE = "http://127.0.0.1:8002/api";

  const [theme, setTheme] = useState(getTheme);
  const [caseData, setCaseData] = useState(null);
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ date_of_progress:"", details_of_progress:"", reminder_date:"", further_action_to_be_taken:"", remarks:"", action_completed:false });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const t = THEMES[theme];
  const isDark = theme === "dark";

  const toggleTheme = () => setTheme(prev => { const n=prev==="dark"?"light":"dark"; try{localStorage.setItem("coats-theme",n);}catch{} return n; });

  const headers = { Authorization: `Bearer ${token}` };

  const load = () => {
    fetch(`${BASE}/cases/${id}/`, { headers })
      .then(r => { if(r.status===401){localStorage.clear();navigate("/login");} return r.json(); })
      .then(setCaseData).catch(()=>{});
    fetch(`${BASE}/cases/${id}/progress/`, { headers })
      .then(r => r.json()).then(setEntries).catch(()=>{});
  };

  useEffect(() => { if(!token){navigate("/login");return;} load(); }, [id]);

  const handleSubmit = async () => {
    if (!form.date_of_progress || !form.details_of_progress) { setErr("Date and Details are required."); return; }
    setSaving(true); setErr(""); setMsg("");
    try {
      const res = await fetch(`${BASE}/cases/${id}/progress/`, {
        method:"POST",
        headers:{ ...headers, "Content-Type":"application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      setMsg("Progress saved successfully.");
      setForm({ date_of_progress:"", details_of_progress:"", reminder_date:"", further_action_to_be_taken:"", remarks:"", action_completed:false });
      load();
    } catch(e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const markDone = async (progressId) => {
    await fetch(`${BASE}/progress/${progressId}/complete/`, { method:"PATCH", headers });
    load();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Sora:wght@300;400;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        @keyframes cFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        input:focus, textarea:focus, select:focus { outline:none; border-color:${t.accent}!important; }
        ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-thumb { background:${t.border}; border-radius:3px; }
      `}</style>

      <div style={{ fontFamily:"'Sora',sans-serif", background:t.bgBase, color:t.textPrimary, minHeight:"100vh", padding:"2rem", transition:"background .25s" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"2rem" }}>
          <div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.67rem", color:t.textMuted, textTransform:"uppercase", letterSpacing:"0.13em", marginBottom:6 }}>🚔 COATS · Progress Updation</div>
            <h1 style={{ fontSize:"1.65rem", fontWeight:700, letterSpacing:"-0.025em" }}>{caseData?.crime_number || "Loading…"}</h1>
            {caseData && <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.7rem", color:t.textMuted, marginTop:4 }}>Branch: {caseData.branch} · Stage: {caseData.current_stage}</div>}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div onClick={toggleTheme} style={{ background:t.toggleBg, border:`1px solid ${t.border}`, borderRadius:50, width:62, height:30, position:"relative", cursor:"pointer" }}>
              <div style={{ position:"absolute", width:22, height:22, borderRadius:"50%", background:t.accent, top:"50%", transform:`translateY(-50%) translateX(${isDark?4:36}px)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, transition:"transform .3s cubic-bezier(.34,1.56,.64,1)" }}>{isDark?"🌙":"☀️"}</div>
            </div>
            <Btn onClick={()=>navigate(`/cases/${id}`)} t={t} accent={t.accent} outline>← Back to Case</Btn>
          </div>
        </div>

        {/* Current Action To Be Taken (from case — shown as checklist) */}
        {caseData?.action_to_be_taken && (
          <div style={{ background:`${t.yellow}10`, border:`1px solid ${t.yellow}44`, borderRadius:14, padding:"1rem 1.25rem", marginBottom:"1.5rem" }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.63rem", textTransform:"uppercase", letterSpacing:"0.1em", color:t.yellow, marginBottom:6 }}>📋 Current Action To Be Taken</div>
            <div style={{ fontFamily:"'Sora',sans-serif", fontSize:"0.9rem", color:t.textPrimary }}>{caseData.action_to_be_taken}</div>
          </div>
        )}

        {msg && <div style={{ background:`${t.green}15`, border:`1px solid ${t.green}44`, borderRadius:10, padding:"10px 16px", marginBottom:"1rem", fontFamily:"'JetBrains Mono',monospace", fontSize:"0.78rem", color:t.green }}>✅ {msg}</div>}
        {err && <div style={{ background:`${t.red}15`, border:`1px solid ${t.red}44`, borderRadius:10, padding:"10px 16px", marginBottom:"1rem", fontFamily:"'JetBrains Mono',monospace", fontSize:"0.78rem", color:t.red }}>⚠ {err}</div>}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem", marginBottom:"1.5rem" }}>
          {/* New Progress Form */}
          <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:"1.5rem", boxShadow:t.shadow }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.67rem", textTransform:"uppercase", letterSpacing:"0.12em", color:t.textMuted, marginBottom:"1.25rem" }}>Add Progress Entry</div>

            <div style={{ marginBottom:"1rem" }}><Label text="Date of Progress *" t={t} />
              <input type="date" value={form.date_of_progress} onChange={e=>setForm({...form,date_of_progress:e.target.value})} style={inputStyle(t)} /></div>

            {/* Checkbox for Action Completed */}
            {caseData?.action_to_be_taken && (
              <div style={{ marginBottom:"1.25rem", display:"flex", alignItems:"center", gap:10, background:form.action_completed?`${t.green}15`:t.bgBase, padding:"10px 14px", borderRadius:10, border:`1px solid ${form.action_completed?t.green:t.border}`, transition:"all .25s" }}>
                <input type="checkbox" checked={form.action_completed} onChange={e=>setForm({...form, action_completed:e.target.checked})} style={{ width:18, height:18, cursor:"pointer", accentColor:t.green }} />
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:"0.8rem", color:form.action_completed?t.green:t.textPrimary, transition:"color .2s", fontWeight:form.action_completed?600:400 }}>
                  Mark Current Action "{caseData.action_to_be_taken}" as Completed?
                </div>
              </div>
            )}

            <div style={{ marginBottom:"1rem" }}><Label text="Details of Progress *" t={t} />
              <textarea rows={3} value={form.details_of_progress} onChange={e=>setForm({...form,details_of_progress:e.target.value})} placeholder="Describe progress made..." style={{...inputStyle(t), resize:"vertical"}} /></div>

            <div style={{ marginBottom:"1rem" }}><Label text="Reminder Date" t={t} />
              <input type="date" value={form.reminder_date} onChange={e=>setForm({...form,reminder_date:e.target.value})} style={inputStyle(t)} /></div>

            <div style={{ marginBottom:"1rem" }}><Label text="Further Action To Be Taken" t={t} />
              <textarea rows={2} value={form.further_action_to_be_taken} onChange={e=>setForm({...form,further_action_to_be_taken:e.target.value})} placeholder="This will become the new action checklist..." style={{...inputStyle(t), resize:"vertical"}} /></div>

            <div style={{ marginBottom:"1.5rem" }}><Label text="Remarks" t={t} />
              <textarea rows={2} value={form.remarks} onChange={e=>setForm({...form,remarks:e.target.value})} placeholder="Any additional remarks..." style={{...inputStyle(t), resize:"vertical"}} /></div>

            <Btn onClick={handleSubmit} t={t} accent={t.green} disabled={saving}>{saving?"Saving…":"✓ Submit Progress"}</Btn>
          </div>

          {/* Previous Entries */}
          <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:"1.5rem", boxShadow:t.shadow }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.67rem", textTransform:"uppercase", letterSpacing:"0.12em", color:t.textMuted, marginBottom:"1.25rem" }}>
              Progress History · {entries.filter(e=>!e.is_completed).length} pending
            </div>

            {entries.length === 0 && (
              <div style={{ textAlign:"center", padding:"3rem", color:t.textMuted, fontFamily:"'JetBrains Mono',monospace", fontSize:"0.75rem" }}>No progress entries yet.</div>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:500, overflowY:"auto" }}>
              {entries.map(entry => (
                <div key={entry.id} style={{ background:entry.is_completed?`${t.green}08`:t.bgCardHover, border:`1px solid ${entry.is_completed?t.green+"33":t.border}`, borderRadius:12, padding:"1rem", opacity:entry.is_completed?0.6:1 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.7rem", color:entry.is_completed?t.green:t.accent }}>
                      {entry.is_completed?"✓ Completed":new Date(entry.date_of_progress).toLocaleDateString("en-IN")}
                      <span style={{ color:t.textMuted, opacity:0.8, marginLeft:8 }}>
                         · by {entry.officer_name || entry.officer_username}
                      </span>
                    </div>
                    {!entry.is_completed && (
                      <button onClick={()=>markDone(entry.id)} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.62rem", padding:"2px 8px", borderRadius:6, border:`1px solid ${t.green}44`, background:`${t.green}12`, color:t.green, cursor:"pointer" }}>
                        ✓ Mark Done
                      </button>
                    )}
                  </div>
                  <div style={{ fontFamily:"'Sora',sans-serif", fontSize:"0.82rem", color:t.textPrimary, marginBottom:4 }}>{entry.details_of_progress}</div>
                  {entry.further_action_to_be_taken && (
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.65rem", color:t.yellow, marginTop:4 }}>
                      → Next action: {entry.further_action_to_be_taken}
                    </div>
                  )}
                  {entry.reminder_date && (
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.62rem", color:t.textMuted, marginTop:2 }}>
                      🔔 Reminder: {new Date(entry.reminder_date).toLocaleDateString("en-IN")}
                    </div>
                  )}
                  {entry.remarks && (
                    <div style={{ fontFamily:"'Sora',sans-serif", fontSize:"0.75rem", color:t.textMuted, marginTop:4, fontStyle:"italic" }}>{entry.remarks}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
