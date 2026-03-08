import { useState } from "react";
import { useNavigate } from "react-router-dom";

const THEMES = {
  dark: {
    bgBase: "#0b0e17", bgCard: "#141927", bgCardHover: "#1a2236",
    border: "#222d42", textPrimary: "#e2e8f5", textSecond: "#7b8db0",
    textMuted: "#3d4f6e", accent: "#4f8ef7", green: "#34d399",
    red: "#f87171", shadow: "0 4px 24px rgba(0,0,0,0.4)", toggleBg: "#1a2236",
  },
  light: {
    bgBase: "#eef2fb", bgCard: "#ffffff", bgCardHover: "#f5f8ff",
    border: "#d2ddf0", textPrimary: "#111827", textSecond: "#4b5e80",
    textMuted: "#96a8c8", accent: "#2563eb", green: "#059669",
    red: "#dc2626", shadow: "0 4px 20px rgba(20,40,100,0.10)", toggleBg: "#e2e8f7",
  },
};

function Login() {
  const getTheme = () => {
    try {
      return localStorage.getItem("coats-theme") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } catch { return "dark"; }
  };

  const [theme, setTheme]     = useState(getTheme);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  const t      = THEMES[theme];
  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem("coats-theme", next); } catch {}
      return next;
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://127.0.0.1:8002/api/token/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error("Invalid credentials");

      localStorage.clear();
      localStorage.setItem("access",  data.access);
      localStorage.setItem("refresh", data.refresh);

      const payload = JSON.parse(atob(data.access.split(".")[1]));
      localStorage.setItem("role",     payload.role);
      localStorage.setItem("branch",   payload.branch);
      localStorage.setItem("username", payload.username);
      localStorage.setItem("coats-theme", theme); // carry theme forward

      console.log("LOGIN PAYLOAD:", payload);

      if (payload.role?.toLowerCase() === "supervisor") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/cases", { replace: true });
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Sora:wght@300;400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes cFadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cShake  { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
        input::placeholder { color: ${t.textMuted}; font-family: 'Sora',sans-serif; }
        ::-webkit-scrollbar { width: 5px; }
      `}</style>

      <div style={{
        fontFamily: "'Sora',sans-serif",
        background: t.bgBase, color: t.textPrimary,
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "2rem", transition: "background .25s, color .2s",
        position: "relative",
      }}>

        {/* ── THEME TOGGLE (top right) ── */}
        <div style={{ position: "absolute", top: 24, right: 24, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", color: t.textSecond }}>
            {isDark ? "Dark" : "Light"}
          </span>
          <div onClick={toggleTheme} style={{ background: t.toggleBg, border: `1px solid ${t.border}`, borderRadius: 50, width: 62, height: 30, position: "relative", cursor: "pointer", transition: "background .25s" }}>
            <div style={{ position: "absolute", width: 22, height: 22, borderRadius: "50%", background: t.accent, top: "50%", transform: `translateY(-50%) translateX(${isDark ? 4 : 36}px)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, transition: "transform .3s cubic-bezier(.34,1.56,.64,1)" }}>
              {isDark ? "🌙" : "☀️"}
            </div>
          </div>
        </div>

        {/* ── LOGIN CARD ── */}
        <div style={{
          background: t.bgCard, border: `1px solid ${t.border}`,
          borderRadius: 20, padding: "2.5rem 2.25rem",
          width: "100%", maxWidth: 400,
          boxShadow: t.shadow,
          animation: "cFadeUp .4s ease",
        }}>

          {/* Logo / Title */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ fontSize: "2.2rem", marginBottom: 10 }}>🚔</div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>
              COATS
            </h1>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.14em", color: t.textMuted }}>
              Case & Offence Administration Tracking System
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: t.border, marginBottom: "1.75rem" }} />

          {/* Form */}
          <form onSubmit={handleLogin}>

            {/* Username */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, display: "block", marginBottom: 6 }}>
                Username
              </label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoComplete="username"
                style={{
                  width: "100%", padding: "0.7rem 1rem",
                  background: t.bgBase, border: `1px solid ${t.border}`,
                  borderRadius: 10, color: t.textPrimary,
                  fontFamily: "'Sora',sans-serif", fontSize: "0.88rem",
                  outline: "none", transition: "border-color .2s",
                }}
                onFocus={e => e.target.style.borderColor = t.accent}
                onBlur={e => e.target.style.borderColor = t.border}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, display: "block", marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  style={{
                    width: "100%", padding: "0.7rem 2.8rem 0.7rem 1rem",
                    background: t.bgBase, border: `1px solid ${t.border}`,
                    borderRadius: 10, color: t.textPrimary,
                    fontFamily: "'Sora',sans-serif", fontSize: "0.88rem",
                    outline: "none", transition: "border-color .2s",
                  }}
                  onFocus={e => e.target.style.borderColor = t.accent}
                  onBlur={e => e.target.style.borderColor = t.border}
                />
                {/* Show/hide toggle */}
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", color: t.textMuted, padding: 4 }}
                >
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: `${t.red}15`, border: `1px solid ${t.red}44`, borderRadius: 8, padding: "8px 12px", marginBottom: "1rem", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem", color: t.red, animation: "cShake .4s ease" }}>
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <LoginButton loading={loading} accent={t.accent} />
          </form>

          {/* Footer */}
          <div style={{ marginTop: "1.5rem", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.63rem", color: t.textMuted }}>
            Authorized personnel only · COATS v1.0
          </div>
        </div>

      </div>
    </>
  );
}

function LoginButton({ loading, accent }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="submit"
      disabled={loading}
      onMouseEnter={() => !loading && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%", padding: "0.8rem",
        background: loading ? `${accent}88` : hov ? accent : `${accent}cc`,
        border: "none", borderRadius: 10, color: "#fff",
        fontFamily: "'JetBrains Mono',monospace", fontSize: "0.82rem",
        fontWeight: 700, letterSpacing: "0.06em",
        cursor: loading ? "not-allowed" : "pointer",
        transition: "background .2s, transform .15s",
        transform: hov && !loading ? "translateY(-1px)" : "translateY(0)",
        boxShadow: hov && !loading ? `0 6px 20px ${accent}44` : "none",
      }}
    >
      {loading ? "Authenticating…" : "Login →"}
    </button>
  );
}

export default Login;
