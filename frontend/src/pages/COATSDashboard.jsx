import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from "recharts";

const BASE = "http://127.0.0.1:8002/api";

async function apiFetch(path) {
  const token = localStorage.getItem("access");
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error("401");
  return res.json();
}

const SEV = {
  Minor:          { color: "#60a5fa", label: "Minor",        ipcs: "279, 283, 290, 294, 341" },
  Bailable:       { color: "#34d399", label: "Bailable",     ipcs: "323, 336, 379, 420, 504" },
  "Non-Bailable": { color: "#f59e0b", label: "Non-Bailable", ipcs: "302, 307, 376, 395, 396" },
  Heinous:        { color: "#f87171", label: "Heinous",       ipcs: "120B, 364A, 376A, 376D"  },
};

const THEMES = {
  dark: {
    bgBase: "#0b0e17", bgCard: "#141927", bgCardHover: "#1a2236",
    border: "#222d42", textPrimary: "#e2e8f5", textSecond: "#7b8db0",
    textMuted: "#637fae", accent: "#4f8ef7", green: "#34d399",
    red: "#f87171", yellow: "#f5c842", purple: "#a78bfa",
    chartGrid: "rgba(255,255,255,0.05)", shadow: "0 4px 24px rgba(0,0,0,0.4)",
    toggleBg: "#1a2236",
  },
  light: {
    bgBase: "#eef2fb", bgCard: "#ffffff", bgCardHover: "#f5f8ff",
    border: "#d2ddf0", textPrimary: "#111827", textSecond: "#4b5e80",
    textMuted: "#434c5c", accent: "#2563eb", green: "#059669",
    red: "#dc2626", yellow: "#d97706", purple: "#7c3aed",
    chartGrid: "rgba(0,0,0,0.06)", shadow: "0 4px 20px rgba(20,40,100,0.10)",
    toggleBg: "#e2e8f7",
  },
};

const EMPTY_KPI = { total_cases: 0, active_cases: 0, closed_cases: 0, cases_this_month: 0 };

// ── Reusable header button ────────────────────────────────────────
function HeaderBtn({ children, onClick, t, accent, outline = false }) {
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

function LiveDot({ color }) {
  return (
    <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: color, marginRight: 7, animation: "cPulse 2s infinite" }} />
  );
}

function Card({ children, t, style = {} }) {
  return (
    <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.3rem", boxShadow: t.shadow, transition: "background .25s, border-color .25s", ...style }}>
      {children}
    </div>
  );
}

function SectionLabel({ children, t }) {
  return (
    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.12em", color: t.textMuted, marginBottom: "1rem", transition: "color .25s" }}>
      {children}
    </div>
  );
}

function EmptyState({ t, msg }) {
  return (
    <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.76rem", lineHeight: 2 }}>
      <div style={{ fontSize: "2rem", marginBottom: 10, opacity: 0.3 }}>📭</div>
      {msg}
    </div>
  );
}

function SeverityBadge({ severity }) {
  const cfg = SEV[severity] || { color: "#8896b3", label: severity };
  return (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: "0.71rem", fontWeight: 600, fontFamily: "'Sora',sans-serif", background: `${cfg.color}1a`, color: cfg.color, border: `1px solid ${cfg.color}44` }}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status, t }) {
  const closed = status === "Closed";
  const color  = closed ? t.green : t.yellow;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 10px", borderRadius: 20, fontSize: "0.71rem", fontWeight: 600, fontFamily: "'Sora',sans-serif", background: `${color}1a`, color, border: `1px solid ${color}44` }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block", animation: !closed ? "cPulse 2s infinite" : "none" }} />
      {status}
    </span>
  );
}

function KpiCard({ label, value, accent, icon, t }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const diff = value - prev.current;
    if (diff === 0) return;
    const steps = 24; let i = 0; const start = prev.current;
    const id = setInterval(() => {
      i++; setDisplay(Math.round(start + (diff * i) / steps));
      if (i >= steps) { clearInterval(id); prev.current = value; }
    }, 28);
    return () => clearInterval(id);
  }, [value]);
  return (
    <div
      style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.2rem 1.4rem", position: "relative", overflow: "hidden", boxShadow: t.shadow, transition: "background .25s, border-color .25s, transform .15s, box-shadow .15s", cursor: "default" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 10px 32px rgba(0,0,0,0.22), 0 0 0 1px ${accent}55`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = t.shadow; }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: "16px 16px 0 0" }} />
      <div style={{ position: "absolute", top: -28, right: -18, width: 80, height: 80, borderRadius: "50%", background: accent, opacity: 0.07, filter: "blur(18px)" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.09em", color: t.textSecond, marginBottom: 8 }}>{label}</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "2rem", fontWeight: 700, color: accent, lineHeight: 1 }}>{display.toLocaleString()}</div>
        </div>
        <div style={{ fontSize: "1.5rem", opacity: 0.4 }}>{icon}</div>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, t }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: "8px 14px", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem", color: t.textPrimary, boxShadow: t.shadow }}>
      <div style={{ color: t.textMuted, marginBottom: 3 }}>{label}</div>
      <div style={{ color: t.accent, fontWeight: 700 }}>{payload[0].value} cases</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function COATSDashboard() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");
  const branch   = localStorage.getItem("branch");
  const role     = localStorage.getItem("role");

  const getTheme = () => {
    try { return localStorage.getItem("coats-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); }
    catch { return "dark"; }
  };

  const [theme, setTheme]       = useState(getTheme);
  const [kpi, setKpi]           = useState(EMPTY_KPI);
  const [severity, setSeverity] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [recent, setRecent]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [flash, setFlash]       = useState(false);
  const prevTotal               = useRef(0);
  const t      = THEMES[theme];
  const isDark = theme === "dark";

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem("coats-theme", next); } catch {}
      return next;
    });
  }, []);

  // ── Navigate to all cases ──────────────────────────────────────
  const handleViewAllCases = () => navigate("/cases");

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  const loadDashboard = useCallback(async () => {
    try {
      const [kpiData, sevData, timeData, recentData] = await Promise.all([
        apiFetch("/dashboard/kpi/"),
        apiFetch("/dashboard/by-severity/"),
        apiFetch("/dashboard/timeline/"),
        apiFetch("/dashboard/recent-cases/"),
      ]);
      if (kpiData.total_cases > prevTotal.current && prevTotal.current !== 0) {
        setFlash(true);
        setTimeout(() => setFlash(false), 3500);
      }
      prevTotal.current = kpiData.total_cases;
      setKpi(kpiData);
      setSeverity(sevData);
      setTimeline(timeData);
      setRecent(recentData);
      setError(null);
      setLastSync(new Date());
      setLoading(false);
    } catch (e) {
      if (e.message === "401") {
        localStorage.clear();
        navigate("/login", { replace: true });
      } else {
        setError("Could not reach the backend. Is Django running?");
        setLoading(false);
      }
    }
  }, [navigate]);

  useEffect(() => {
    loadDashboard();
    const id = setInterval(loadDashboard, 5000);
    return () => clearInterval(id);
  }, [loadDashboard]);

  const sevChartData = severity.map(s => ({
    name: s.severity, total: s.total,
    fill: SEV[s.severity]?.color || "#8896b3",
  }));
  const timeData = timeline.map(d => ({
    label: new Date(d.month).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
    total: d.total,
  }));
  const totalSev = severity.reduce((a, s) => a + s.total, 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Sora:wght@300;400;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes cPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}
        @keyframes cSlide{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div style={{ fontFamily: "'Sora',sans-serif", background: t.bgBase, color: t.textPrimary, minHeight: "100vh", padding: "2rem", transition: "background .25s, color .2s" }}>

        {/* ── TOAST ── */}
        {flash && (
          <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: t.green, color: "#fff", padding: "10px 18px", borderRadius: 10, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.82rem", boxShadow: `0 4px 20px ${t.green}66`, animation: "cSlide .3s ease", display: "flex", alignItems: "center", gap: 8 }}>
            🔔 New case filed and recorded
          </div>
        )}

        {/* ── HEADER ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.13em", marginBottom: 6 }}>
              <LiveDot color={loading ? t.yellow : t.green} />
              {loading ? "Connecting…" : "Live · Polls every 5s"}
              {lastSync && !loading && <span style={{ marginLeft: 10 }}>· Synced {lastSync.toLocaleTimeString("en-IN")}</span>}
            </div>
            <h1 style={{ fontSize: "1.65rem", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.2 }}>
              🚔 COATS Command Center
            </h1>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.68rem", color: t.textMuted, marginTop: 5 }}>
              {username && <>Logged in as <span style={{ color: t.accent }}>{username}</span> · {role === "SUPERVISOR" ? "Supervisor" : "Case Officer"} · {branch}</>}
            </div>
          </div>

          {/* ── TOP-RIGHT CONTROLS ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

            {/* Theme toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 2 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", color: t.textSecond }}>{isDark ? "Dark" : "Light"}</span>
              <div onClick={toggleTheme} style={{ background: t.toggleBg, border: `1px solid ${t.border}`, borderRadius: 50, width: 62, height: 30, position: "relative", cursor: "pointer", transition: "background .25s" }}>
                <div style={{ position: "absolute", width: 22, height: 22, borderRadius: "50%", background: t.accent, top: "50%", transform: `translateY(-50%) translateX(${isDark ? 4 : 36}px)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, transition: "transform .3s cubic-bezier(.34,1.56,.64,1)" }}>
                  {isDark ? "🌙" : "☀️"}
                </div>
              </div>
            </div>

            {/* ── VIEW ALL CASES BUTTON ── */}
            <HeaderBtn onClick={handleViewAllCases} t={t} accent={t.purple}>
              📋 All Cases
            </HeaderBtn>

            {/* Logout */}
            <HeaderBtn onClick={handleLogout} t={t} accent={t.red} outline>
              Logout
            </HeaderBtn>
          </div>
        </div>

        {/* ── ERROR BANNER ── */}
        {error && (
          <div style={{ background: `${t.red}15`, border: `1px solid ${t.red}44`, borderRadius: 10, padding: "10px 16px", marginBottom: "1.5rem", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem", color: t.red }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── KPI CARDS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          <KpiCard label="Total Cases"      value={kpi.total_cases}      accent={t.accent} icon="📁" t={t} />
          <KpiCard label="Active Cases"     value={kpi.active_cases}     accent={t.yellow} icon="🔍" t={t} />
          <KpiCard label="Closed Cases"     value={kpi.closed_cases}     accent={t.green}  icon="✅" t={t} />
          <KpiCard label="Cases This Month" value={kpi.cases_this_month} accent={t.red}    icon="📅" t={t} />
        </div>

        {/* ── CHARTS ROW ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <Card t={t}>
            <SectionLabel t={t}>Cases by Severity — IPC Classification</SectionLabel>
            {sevChartData.length === 0 || sevChartData.every(d => d.total === 0) ? (
              <EmptyState t={t} msg="No cases registered yet. Chart will populate once cases are filed." />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={sevChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke={t.chartGrid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip t={t} />} />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                      {sevChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10 }}>
                  {Object.entries(SEV).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", color: t.textSecond }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: v.color, display: "inline-block" }} />
                      {v.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          <Card t={t}>
            <SectionLabel t={t}>Monthly Filing Trend</SectionLabel>
            {timeData.length === 0 ? (
              <EmptyState t={t} msg="Timeline builds as cases are filed over time." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={timeData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={t.accent} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={t.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={t.chartGrid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip t={t} />} />
                  <Line type="monotone" dataKey="total" stroke={t.accent} strokeWidth={2.5} dot={{ r: 4, fill: t.accent, strokeWidth: 0 }} activeDot={{ r: 6 }} fill="url(#lg)" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* ── DONUT + IPC TABLE ── */}
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <Card t={t}>
            <SectionLabel t={t}>Severity Distribution</SectionLabel>
            {sevChartData.every(d => d.total === 0) ? (
              <EmptyState t={t} msg="Awaiting cases." />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={sevChartData} dataKey="total" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} strokeWidth={0}>
                    {sevChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip
  contentStyle={{
    background: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: 10,
    fontFamily: "'JetBrains Mono',monospace",
    fontSize: "0.78rem",
    color: t.textPrimary,
    boxShadow: t.shadow,
  }}
  labelStyle={{ color: t.textMuted, marginBottom: 3 }}
  formatter={(value, name) => [
    <span style={{ color: t.accent, fontWeight: 700 }}>{value} cases</span>,
    <span style={{ color: t.textSecond }}>{name}</span>,
  ]}
/>
                  <Legend formatter={v => <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.68rem", color: t.textSecond }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card t={t}>
            <SectionLabel t={t}>Severity Breakdown — IPC Reference</SectionLabel>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr>
                  {["Severity", "IPC Sections (examples)", "Cases", "% Share"].map(h => (
                    <th key={h} style={{ textAlign: "left", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.64rem", letterSpacing: "0.1em", textTransform: "uppercase", color: t.textMuted, padding: "0.4rem 0.75rem", borderBottom: `1px solid ${t.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(SEV).map(([key, cfg], i, arr) => {
                  const match = severity.find(s => s.severity === key);
                  const count = match?.total || 0;
                  const pct   = totalSev > 0 ? ((count / totalSev) * 100).toFixed(1) + "%" : "—";
                  const last  = i === arr.length - 1;
                  const td    = { padding: "0.6rem 0.75rem", borderBottom: last ? "none" : `1px solid ${t.border}` };
                  return (
                    <tr key={key}>
                      <td style={td}><SeverityBadge severity={key} /></td>
                      <td style={{ ...td, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.73rem", color: t.textMuted }}>IPC {cfg.ipcs}</td>
                      <td style={{ ...td, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.88rem", fontWeight: 700, color: cfg.color }}>{count}</td>
                      <td style={{ ...td, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem", color: t.textSecond }}>{pct}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>

        {/* ── RECENT CASES ── */}
        <Card t={t}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <SectionLabel t={t}>Recently Filed Cases</SectionLabel>
            {recent.length > 0 && (
              <button
                onClick={handleViewAllCases}
                style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.68rem", background: "transparent", border: "none", color: t.accent, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, padding: 0, marginBottom: "1rem" }}
              >
                View all →
              </button>
            )}
          </div>
          {recent.length === 0 ? (
            <EmptyState t={t} msg={"No cases yet.\nNew cases appear here instantly when filed by Case Officers."} />
          ) : (
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr>
                  {["Case / Crime No.", "IPC Section", "Severity", "Stage", "Date Filed"].map(h => (
                    <th key={h} style={{ textAlign: "left", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.64rem", letterSpacing: "0.1em", textTransform: "uppercase", color: t.textMuted, padding: "0.45rem 0.75rem", borderBottom: `1px solid ${t.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((c, i) => (
                  <RecentRow key={c.id} c={c} t={t} last={i === recent.length - 1} navigate={navigate} />
                ))}
              </tbody>
            </table>
          )}
        </Card>

      </div>
    </>
  );
}

function RecentRow({ c, t, last, navigate }) {
  const [hov, setHov] = useState(false);
  const td = {
    padding: "0.65rem 0.75rem",
    borderBottom: last ? "none" : `1px solid ${t.border}`,
    background: hov ? t.bgCardHover : "transparent",
    transition: "background .15s",
    cursor: "pointer",
  };
  return (
    <tr
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => navigate(`/cases/${c.id}`)}
      title="Click to view case detail"
    >
      <td style={{ ...td, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.82rem", fontWeight: 600, color: t.accent }}>{c.case_number}</td>
      <td style={{ ...td, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem", color: t.textMuted }}>{c.ipc_section}</td>
      <td style={td}><SeverityBadge severity={c.severity} /></td>
      <td style={td}><StatusBadge status={c.status} t={t} /></td>
      <td style={{ ...td, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem", color: t.textSecond }}>{c.date_of_registration}</td>
    </tr>
  );
}
