import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const THEMES = {
  dark: {
    bgBase: "#0b0e17", bgCard: "#141927", bgCardHover: "#1a2236",
    border: "#222d42", textPrimary: "#e2e8f5", textSecond: "#7b8db0",
    textMuted: "#3d4f6e", accent: "#4f8ef7", green: "#34d399",
    red: "#f87171", yellow: "#f5c842", purple: "#a78bfa",
    shadow: "0 4px 24px rgba(0,0,0,0.4)", toggleBg: "#1a2236",
  },
  light: {
    bgBase: "#eef2fb", bgCard: "#ffffff", bgCardHover: "#f5f8ff",
    border: "#d2ddf0", textPrimary: "#111827", textSecond: "#4b5e80",
    textMuted: "#96a8c8", accent: "#2563eb", green: "#059669",
    red: "#dc2626", yellow: "#d97706", purple: "#7c3aed",
    shadow: "0 4px 20px rgba(20,40,100,0.10)", toggleBg: "#e2e8f7",
  },
};

const STAGE = {
  UI: { label: "Under Investigation", color: "#f5c842" },
  PT: { label: "Pending Trial",       color: "#a78bfa" },
  HC: { label: "Pending before HC",   color: "#fb923c" },
  SC: { label: "Pending before SC",   color: "#f87171" },
  CC: { label: "Closed",              color: "#34d399" },
};

function StageBadge({ code }) {
  const s = STAGE[code] || { label: code, color: "#8896b3" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 10px", borderRadius: 20,
      fontSize: "0.71rem", fontWeight: 600, fontFamily: "'Sora',sans-serif",
      background: `${s.color}1a`, color: s.color, border: `1px solid ${s.color}44`,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: "50%", background: s.color,
        display: "inline-block",
        animation: code !== "CC" ? "cPulse 2s infinite" : "none",
      }} />
      {s.label}
    </span>
  );
}

function Btn({ children, onClick, t, accent, outline = false }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem",
        fontWeight: 600, cursor: "pointer", borderRadius: 8,
        padding: "6px 14px", transition: "all .2s",
        background: outline ? "transparent" : hov ? accent : `${accent}18`,
        border: `1px solid ${hov ? accent : outline ? t.border : `${accent}44`}`,
        color: outline ? (hov ? t.red : t.textSecond) : (hov ? "#fff" : accent),
      }}
    >
      {children}
    </button>
  );
}

function CaseRow({ c, t, last, navigate, index }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={() => navigate(`/cases/${c.id}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "grid", gridTemplateColumns: "2fr 2.5fr 1.5fr 1.2fr 0.5fr",
        padding: "0.85rem 1.2rem",
        borderBottom: last ? "none" : `1px solid ${t.border}`,
        background: hov ? t.bgCardHover : "transparent",
        cursor: "pointer", transition: "background .15s",
        animation: "cFadeUp .3s ease both",
        animationDelay: `${index * 40}ms`,
      }}
    >
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.83rem", fontWeight: 700, color: t.accent, alignSelf: "center" }}>
        {c.crime_number}
      </div>
      <div style={{ alignSelf: "center" }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.8rem", color: t.textPrimary, marginBottom: 2 }}>
          {c.section_of_law}
        </div>
        {c.complainant_name && (
          <div style={{ fontSize: "0.7rem", color: t.textMuted }}>{c.complainant_name}</div>
        )}
      </div>
      <div style={{ alignSelf: "center" }}>
        <StageBadge code={c.current_stage} />
      </div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.76rem", color: t.textMuted, alignSelf: "center" }}>
        {c.date_of_registration}
      </div>
      <div style={{ alignSelf: "center", textAlign: "right", color: hov ? t.accent : t.textMuted, fontSize: "0.9rem", transition: "color .15s, transform .15s", transform: hov ? "translateX(3px)" : "translateX(0)" }}>
        →
      </div>
    </div>
  );
}

function Cases() {
  const getTheme = () => {
    try {
      return localStorage.getItem("coats-theme") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } catch { return "dark"; }
  };

  const [theme, setTheme]             = useState(getTheme);
  const [cases, setCases]             = useState([]);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filterStage, setFilterStage] = useState("ALL");

  const role     = localStorage.getItem("role");
  const username = localStorage.getItem("username");
  const branch   = localStorage.getItem("branch");
  const navigate = useNavigate();
  const t        = THEMES[theme];
  const isDark   = theme === "dark";

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem("coats-theme", next); } catch {}
      return next;
    });
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  const fetchCases = useCallback(() => {
    const token = localStorage.getItem("access");
    if (!token) { navigate("/login", { replace: true }); return; }

    fetch("http://127.0.0.1:8002/api/cases/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(data => { setCases(data); setError(""); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [navigate]);

  useEffect(() => {
    fetchCases();
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = () => window.history.pushState(null, "", window.location.href);
    return () => { window.onpopstate = null; };
  }, [fetchCases]);

  const filtered = cases.filter(c => {
    const matchStage  = filterStage === "ALL" || c.current_stage === filterStage;
    const q           = search.toLowerCase();
    const matchSearch = !q
      || c.crime_number?.toLowerCase().includes(q)
      || c.section_of_law?.toLowerCase().includes(q)
      || c.complainant_name?.toLowerCase().includes(q);
    return matchStage && matchSearch;
  });

  const stageCount = code => cases.filter(c => c.current_stage === code).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Sora:wght@300;400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes cPulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.75)} }
        @keyframes cFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 3px; }
        input::placeholder { color: ${t.textMuted}; }
        select option { background: ${t.bgCard}; color: ${t.textPrimary}; }
      `}</style>

      <div style={{ fontFamily: "'Sora',sans-serif", background: t.bgBase, color: t.textPrimary, minHeight: "100vh", padding: "2rem", transition: "background .25s, color .2s" }}>

        {/* ── HEADER ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.13em", marginBottom: 6 }}>
              🚔 COATS · Case Management
            </div>
            <h1 style={{ fontSize: "1.65rem", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.2 }}>
              {role === "CASE" ? "My Cases" : "All Cases"}
            </h1>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.68rem", color: t.textMuted, marginTop: 5 }}>
              <span style={{ color: t.accent }}>{username}</span>
              {" · "}{role === "CASE" ? "Case Officer" : "Supervisor"}
              {" · "}{branch}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Theme toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", color: t.textSecond }}>
                {isDark ? "Dark" : "Light"}
              </span>
              <div
                onClick={toggleTheme}
                style={{ background: t.toggleBg, border: `1px solid ${t.border}`, borderRadius: 50, width: 62, height: 30, position: "relative", cursor: "pointer", transition: "background .25s" }}
              >
                <div style={{ position: "absolute", width: 22, height: 22, borderRadius: "50%", background: t.accent, top: "50%", transform: `translateY(-50%) translateX(${isDark ? 4 : 36}px)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, transition: "transform .3s cubic-bezier(.34,1.56,.64,1)" }}>
                  {isDark ? "🌙" : "☀️"}
                </div>
              </div>
            </div>

            {role === "SUPERVISOR" && (
              <Btn onClick={() => navigate("/dashboard")} t={t} accent={t.purple}>📊 Dashboard</Btn>
            )}
            {role === "CASE" && (
              <Btn onClick={() => navigate("/create-case")} t={t} accent={t.green}>+ New Case</Btn>
            )}
            <Btn onClick={handleLogout} t={t} accent={t.red} outline>Logout</Btn>
          </div>
        </div>

        {/* ── STAGE STATS STRIP ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {Object.entries(STAGE).map(([code, s]) => (
            <div
              key={code}
              onClick={() => setFilterStage(filterStage === code ? "ALL" : code)}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              style={{
                background: filterStage === code ? `${s.color}18` : t.bgCard,
                border: `1px solid ${filterStage === code ? s.color + "55" : t.border}`,
                borderRadius: 12, padding: "0.9rem 1rem",
                cursor: "pointer", transition: "all .2s",
                boxShadow: filterStage === code ? `0 0 0 1px ${s.color}33` : t.shadow,
              }}
            >
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.09em", color: t.textMuted, marginBottom: 4 }}>
                {s.label}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "1.5rem", fontWeight: 700, color: s.color }}>
                {stageCount(code)}
              </div>
            </div>
          ))}
        </div>

        {/* ── SEARCH + FILTER BAR ── */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", alignItems: "center" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: "0.9rem", opacity: 0.4 }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by crime no., IPC section, complainant…"
              style={{ width: "100%", padding: "0.6rem 0.75rem 0.6rem 2.2rem", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, color: t.textPrimary, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.8rem", outline: "none", transition: "border-color .2s" }}
              onFocus={e => e.target.style.borderColor = t.accent}
              onBlur={e => e.target.style.borderColor = t.border}
            />
          </div>
          <select
            value={filterStage}
            onChange={e => setFilterStage(e.target.value)}
            style={{ padding: "0.6rem 1rem", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, color: t.textSecond, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem", outline: "none", cursor: "pointer" }}
          >
            <option value="ALL">All Stages</option>
            {Object.entries(STAGE).map(([code, s]) => (
              <option key={code} value={code}>{s.label}</option>
            ))}
          </select>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", color: t.textMuted, whiteSpace: "nowrap" }}>
            {filtered.length} of {cases.length} cases
          </div>
        </div>

        {/* ── ERROR ── */}
        {error && (
          <div style={{ background: `${t.red}15`, border: `1px solid ${t.red}44`, borderRadius: 10, padding: "10px 16px", marginBottom: "1rem", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem", color: t.red }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── CASES TABLE ── */}
        <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, boxShadow: t.shadow, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2.5fr 1.5fr 1.2fr 0.5fr", padding: "0.6rem 1.2rem", borderBottom: `1px solid ${t.border}` }}>
            {["Crime No.", "IPC Section", "Stage", "Date Filed", ""].map((h, i) => (
              <div key={i} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted }}>
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.8rem" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 10, opacity: 0.3 }}>⏳</div>
              Loading cases…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.8rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: 10, opacity: 0.3 }}>📭</div>
              {cases.length === 0 ? "No cases found." : "No cases match your search."}
            </div>
          ) : (
            filtered.map((c, i) => (
              <CaseRow
                key={c.id} c={c} t={t}
                last={i === filtered.length - 1}
                navigate={navigate} index={i}
              />
            ))
          )}
        </div>

      </div>
    </>
  );
}

export default Cases;
