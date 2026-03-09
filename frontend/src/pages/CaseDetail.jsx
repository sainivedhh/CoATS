import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const THEMES = {
  dark: {
    bgBase: "#0b0e17", bgCard: "#141927", bgCardHover: "#1a2236",
    border: "#222d42", textPrimary: "#e2e8f5", textSecond: "#7b8db0",
    textMuted: "#637fae", accent: "#4f8ef7", green: "#34d399",
    red: "#f87171", yellow: "#f5c842", purple: "#a78bfa",
    shadow: "0 4px 24px rgba(0,0,0,0.4)", toggleBg: "#1a2236",
  },
  light: {
    bgBase: "#eef2fb", bgCard: "#ffffff", bgCardHover: "#f5f8ff",
    border: "#d2ddf0", textPrimary: "#111827", textSecond: "#4b5e80",
    textMuted: "#434c5c", accent: "#2563eb", green: "#059669",
    red: "#dc2626", yellow: "#d97706", purple: "#7c3aed",
    shadow: "0 4px 20px rgba(20,40,100,0.10)", toggleBg: "#e2e8f7",
  },
};

const STAGE = {
  UI: { label: "Under Investigation",       color: "#f5c842" },
  PT: { label: "Pending Trial",             color: "#a78bfa" },
  HC: { label: "Pending before High Court", color: "#fb923c" },
  SC: { label: "Pending before Supreme Court", color: "#f87171" },
  CC: { label: "Case Closed",               color: "#34d399" },
};

function StageBadge({ code }) {
  const s = STAGE[code] || { label: code, color: "#8896b3" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 14px", borderRadius: 20,
      fontSize: "0.75rem", fontWeight: 600, fontFamily: "'Sora',sans-serif",
      background: `${s.color}1a`, color: s.color, border: `1px solid ${s.color}44`,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%", background: s.color,
        display: "inline-block",
        animation: code !== "CC" ? "cPulse 2s infinite" : "none",
      }} />
      {s.label}
    </span>
  );
}

function Field({ label, value, t }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.9rem", color: t.textPrimary, lineHeight: 1.6 }}>
        {value || <span style={{ color: t.textMuted, fontStyle: "italic" }}>—</span>}
      </div>
    </div>
  );
}

function Btn({ children, onClick, t, accent, outline = false, disabled = false }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem",
        fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        borderRadius: 8, padding: "8px 18px", transition: "all .2s",
        opacity: disabled ? 0.45 : 1,
        background: outline ? "transparent" : hov ? accent : `${accent}18`,
        border: `1px solid ${hov && !disabled ? accent : outline ? t.border : `${accent}44`}`,
        color: outline ? (hov ? t.red : t.textSecond) : (hov ? "#fff" : accent),
      }}
    >
      {children}
    </button>
  );
}

function CaseDetail() {
  const getTheme = () => {
    try {
      return localStorage.getItem("coats-theme") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } catch { return "dark"; }
  };

  const { id }   = useParams();
  const navigate = useNavigate();
  const role     = localStorage.getItem("role");

  const [theme, setTheme]     = useState(getTheme);
  const [caseData, setCaseData] = useState(null);
  const [form, setForm]       = useState({ current_stage: "", action_to_be_taken: "" });
  const [error, setError]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  const t      = THEMES[theme];
  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem("coats-theme", next); } catch {}
      return next;
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("access");
    fetch(`http://127.0.0.1:8002/api/cases/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to load case");
        return res.json();
      })
      .then(data => {
        setCaseData(data);
        setForm({ current_stage: data.current_stage || "", action_to_be_taken: data.action_to_be_taken || "" });
      })
      .catch(err => setError(err.message));
  }, [id]);

  const isClosed   = caseData?.current_stage === "CC";
  const canEdit    = role === "CASE" && !isClosed;

  const handleUpdate = async () => {
    const token = localStorage.getItem("access");
    setSaving(true);
    try {
      const res = await fetch(`http://127.0.0.1:8002/api/cases/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Update failed");
      setSaved(true);
      setTimeout(() => navigate("/cases"), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Sora:wght@300;400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes cPulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.75)} }
        @keyframes cFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        textarea:focus, select:focus { outline: none; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 3px; }
      `}</style>

      <div style={{ fontFamily: "'Sora',sans-serif", background: t.bgBase, color: t.textPrimary, minHeight: "100vh", padding: "2rem", transition: "background .25s, color .2s" }}>

        {/* ── HEADER ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.13em", marginBottom: 6 }}>
              🚔 COATS · Case Detail
            </div>
            <h1 style={{ fontSize: "1.65rem", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.2 }}>
              {caseData ? caseData.crime_number : "Loading…"}
            </h1>
            {caseData && (
              <div style={{ marginTop: 8 }}>
                <StageBadge code={caseData.current_stage} />
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Theme toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", color: t.textSecond }}>
                {isDark ? "Dark" : "Light"}
              </span>
              <div onClick={toggleTheme} style={{ background: t.toggleBg, border: `1px solid ${t.border}`, borderRadius: 50, width: 62, height: 30, position: "relative", cursor: "pointer", transition: "background .25s" }}>
                <div style={{ position: "absolute", width: 22, height: 22, borderRadius: "50%", background: t.accent, top: "50%", transform: `translateY(-50%) translateX(${isDark ? 4 : 36}px)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, transition: "transform .3s cubic-bezier(.34,1.56,.64,1)" }}>
                  {isDark ? "🌙" : "☀️"}
                </div>
              </div>
            </div>
            <Btn onClick={() => navigate("/cases")} t={t} accent={t.accent} outline>← Back</Btn>
          </div>
        </div>

        {/* ── ERROR ── */}
        {error && (
          <div style={{ background: `${t.red}15`, border: `1px solid ${t.red}44`, borderRadius: 10, padding: "10px 16px", marginBottom: "1.5rem", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem", color: t.red }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── SUCCESS FLASH ── */}
        {saved && (
          <div style={{ background: `${t.green}15`, border: `1px solid ${t.green}44`, borderRadius: 10, padding: "10px 16px", marginBottom: "1.5rem", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem", color: t.green }}>
            ✅ Case updated successfully. Redirecting…
          </div>
        )}

        {/* ── LOADING ── */}
        {!caseData && !error && (
          <div style={{ textAlign: "center", padding: "4rem", color: t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.8rem" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: 10, opacity: 0.3 }}>⏳</div>
            Loading case details…
          </div>
        )}

        {caseData && (
          <div style={{ animation: "cFadeIn .35s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>

              {/* ── CASE INFO CARD ── */}
              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", boxShadow: t.shadow }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.12em", color: t.textMuted, marginBottom: "1.25rem" }}>
                  Case Information
                </div>
                <Field label="Branch"        value={caseData.branch}           t={t} />
                <Field label="PS Limit"      value={caseData.ps_limit}         t={t} />
                <Field label="Crime No."     value={caseData.crime_number}     t={t} />
                <Field label="IPC Section"   value={caseData.section_of_law}   t={t} />
                <Field label="Date of Occurrence"    value={caseData.date_of_occurrence}    t={t} />
                <Field label="Date of Registration"  value={caseData.date_of_registration}  t={t} />
                {role === "SUPERVISOR" && (
                  <Field label="Case Handler" value={caseData.case_holding_officer_username} t={t} />
                )}
              </div>

              {/* ── PARTIES CARD ── */}
              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", boxShadow: t.shadow }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.12em", color: t.textMuted, marginBottom: "1.25rem" }}>
                  Parties & Gist
                </div>
                <Field label="Complainant"   value={caseData.complainant_name}  t={t} />
                <Field label="Accused Details" value={caseData.accused_details} t={t} />
                <Field label="Gist of Case"  value={caseData.gist_of_case}     t={t} />
              </div>
            </div>

            {/* ── UPDATE CARD ── */}
            <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", boxShadow: t.shadow }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.12em", color: t.textMuted, marginBottom: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Case Status & Action</span>
                {isClosed && (
                  <span style={{ background: `${t.green}18`, color: t.green, border: `1px solid ${t.green}44`, borderRadius: 20, padding: "2px 10px", fontSize: "0.68rem" }}>
                    🔒 Case Closed — Read Only
                  </span>
                )}
                {role === "SUPERVISOR" && !isClosed && (
                  <span style={{ background: `${t.yellow}18`, color: t.yellow, border: `1px solid ${t.yellow}44`, borderRadius: 20, padding: "2px 10px", fontSize: "0.68rem" }}>
                    👁 Supervisor View — Read Only
                  </span>
                )}
              </div>

              {/* Stage selector */}
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, marginBottom: 6 }}>
                  Current Stage
                </div>
                <select
                  name="current_stage"
                  value={form.current_stage}
                  onChange={e => setForm({ ...form, current_stage: e.target.value })}
                  disabled={!canEdit}
                  style={{
                    width: "100%", padding: "0.65rem 1rem",
                    background: canEdit ? t.bgBase : t.bgCardHover,
                    border: `1px solid ${t.border}`, borderRadius: 10,
                    color: canEdit ? t.textPrimary : t.textMuted,
                    fontFamily: "'JetBrains Mono',monospace", fontSize: "0.82rem",
                    cursor: canEdit ? "pointer" : "not-allowed",
                    transition: "border-color .2s",
                  }}
                  onFocus={e => canEdit && (e.target.style.borderColor = t.accent)}
                  onBlur={e => e.target.style.borderColor = t.border}
                >
                  {Object.entries(STAGE).map(([code, s]) => (
                    <option key={code} value={code}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Action textarea */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, marginBottom: 6 }}>
                  Action to be Taken
                </div>
                <textarea
                  name="action_to_be_taken"
                  value={form.action_to_be_taken}
                  onChange={e => setForm({ ...form, action_to_be_taken: e.target.value })}
                  disabled={!canEdit}
                  rows={4}
                  style={{
                    width: "100%", padding: "0.75rem 1rem",
                    background: canEdit ? t.bgBase : t.bgCardHover,
                    border: `1px solid ${t.border}`, borderRadius: 10,
                    color: canEdit ? t.textPrimary : t.textMuted,
                    fontFamily: "'Sora',sans-serif", fontSize: "0.88rem",
                    resize: "vertical", lineHeight: 1.6,
                    cursor: canEdit ? "text" : "not-allowed",
                    transition: "border-color .2s",
                  }}
                  onFocus={e => canEdit && (e.target.style.borderColor = t.accent)}
                  onBlur={e => e.target.style.borderColor = t.border}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                {canEdit && (
                  <Btn onClick={handleUpdate} t={t} accent={t.green} disabled={saving}>
                    {saving ? "Saving…" : "✓ Update Case"}
                  </Btn>
                )}
                <Btn onClick={() => navigate("/cases")} t={t} accent={t.accent} outline>
                  ← Back to Cases
                </Btn>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}

export default CaseDetail;
