import { useEffect, useState } from "react";
import { fetchHealth, fetchAppearance, fetchMe, logout } from "./api.js";
import { C, buildRatings } from "./theme.js";
import { DEFAULTS } from "./defaults.js";
import Auth from "./views/Auth.jsx";
import Home from "./views/Home.jsx";
import Spending from "./views/Spending.jsx";
import Report from "./views/Report.jsx";
import Settings from "./views/Settings.jsx";

const TABS = [
  { id: "home", label: "This month", icon: "🪞" },
  { id: "spending", label: "Spending", icon: "🧾" },
  { id: "report", label: "Report", icon: "📈" },
  { id: "settings", label: "Settings", icon: "🎨" },
];

const monthLabel = new Date().toLocaleDateString("en-US", {
  month: "long",
  year: "numeric",
});

export default function App() {
  const [tab, setTab] = useState("home");
  const [demo, setDemo] = useState(true);
  const [user, setUser] = useState(undefined); // undefined = checking, null = signed out
  const [appearance, setAppearance] = useState(DEFAULTS);

  useEffect(() => {
    fetchHealth().then((h) => setDemo(h.demo));
    fetchMe().then(setUser);
  }, []);

  useEffect(() => {
    if (user) fetchAppearance().then(setAppearance);
  }, [user]);

  const ratings = buildRatings(appearance);

  const signOut = async () => {
    await logout();
    setUser(null);
    setTab("home");
    setAppearance(DEFAULTS);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.paper,
        display: "flex",
        justifyContent: "center",
        padding: "28px 12px 90px",
        fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
        color: C.ink,
        zoom: appearance.textScale, // text-size setting scales the whole UI
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Spline+Sans+Mono:wght@500;600&display=swap');
        .rateBtn { transition: transform .12s ease, box-shadow .12s ease; cursor: pointer; border: none; }
        .rateBtn:hover { transform: translateY(-2px); }
        .rateBtn:focus-visible { outline: 3px solid ${C.ink}; outline-offset: 2px; }
        .tabBtn:focus-visible { outline: 3px solid ${C.ink}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { .rateBtn { transition: none; } }
      `}</style>

      <div style={{ width: "100%", maxWidth: 420 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.muted,
            }}
          >
            Hindsight · {monthLabel} {demo && user && "· demo data"}
          </div>
          {user && (
            <button
              onClick={signOut}
              style={{
                border: "none",
                background: "transparent",
                color: C.muted,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Sign out
            </button>
          )}
        </div>

        {user === undefined && (
          <p style={{ color: C.muted, fontSize: 13, textAlign: "center" }}>Loading…</p>
        )}
        {user === null && <Auth onSignedIn={setUser} />}
        {user && (
          <>
            {tab === "home" && <Home ratings={ratings} demo={demo} user={user} />}
            {tab === "spending" && <Spending ratings={ratings} />}
            {tab === "report" && <Report ratings={ratings} />}
            {tab === "settings" && (
              <Settings appearance={appearance} onSaved={setAppearance} />
            )}
          </>
        )}
      </div>

      {/* bottom tab bar (only when signed in) */}
      {user && (
        <nav
          aria-label="Main"
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            justifyContent: "center",
            background: "rgba(255,255,255,.94)",
            backdropFilter: "blur(8px)",
            borderTop: `1px solid ${C.line}`,
          }}
        >
          <div style={{ display: "flex", width: "100%", maxWidth: 420 }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                className="tabBtn"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                style={{
                  flex: 1,
                  padding: "10px 4px 12px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 11.5,
                  fontWeight: tab === t.id ? 800 : 600,
                  color: tab === t.id ? C.ink : C.muted,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  borderTop: `3px solid ${tab === t.id ? C.ink : "transparent"}`,
                }}
              >
                <span style={{ fontSize: 17 }} aria-hidden="true">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
