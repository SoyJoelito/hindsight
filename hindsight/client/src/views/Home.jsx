import { useEffect, useState, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import {
  fetchTransactions,
  rateTransaction,
  createLinkToken,
  exchangePublicToken,
  syncTransactions,
} from "../api.js";
import { C } from "../theme.js";

const money = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function Dot({ color, size = 8 }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: size,
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

/* "your past self" memory chip — data comes from the API */
function Memory({ memory, ratings }) {
  if (!memory) return null;
  return (
    <div
      style={{
        marginTop: 10,
        padding: "8px 10px",
        borderRadius: 10,
        background: C.paper,
        border: `1px solid ${C.line}`,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ fontSize: 14 }}>🪞</span>
      <div>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: C.muted,
            fontWeight: 700,
            marginBottom: 3,
          }}
        >
          Your past self
        </div>
        <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.35 }}>
          {memory.note}
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
          {memory.history.map((r, i) => (
            <Dot key={i} color={ratings[r].color} size={7} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ConnectBank({ onLinked }) {
  const [linkToken, setLinkToken] = useState(null);

  useEffect(() => {
    createLinkToken().then((d) => {
      if (d.link_token) setLinkToken(d.link_token);
    });
  }, []);

  const onSuccess = useCallback(
    async (public_token, metadata) => {
      await exchangePublicToken(public_token, metadata?.institution?.name);
      await syncTransactions();
      onLinked();
    },
    [onLinked]
  );

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess });

  if (!linkToken) return null;
  return (
    <button
      className="rateBtn"
      onClick={() => open()}
      disabled={!ready}
      style={{
        width: "100%",
        padding: "12px",
        borderRadius: 12,
        background: C.ink,
        color: "#fff",
        fontWeight: 700,
        fontSize: 14,
        fontFamily: "inherit",
        marginBottom: 16,
      }}
    >
      🏦 Connect your bank
    </button>
  );
}

export default function Home({ ratings, demo, user }) {
  const [txs, setTxs] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setTxs(await fetchTransactions());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rate = async (id, rating) => {
    const tx = txs.find((x) => x.id === id);
    setTxs((t) => t.map((x) => (x.id === id ? { ...x, rating } : x))); // optimistic
    const resp = await rateTransaction(id, rating);
    if (resp.warned && resp.message) {
      setToast(resp.message); // the server writes it in the app's voice
      setTimeout(() => setToast(null), 5200);
    }
  };

  const total = txs.reduce((s, t) => s + t.amount, 0);
  const sums = { green: 0, yellow: 0, red: 0, unrated: 0 };
  txs.forEach((t) => (sums[t.rating || "unrated"] += t.amount));

  const unrated = txs.filter((t) => !t.rating);
  const rated = txs.filter((t) => t.rating);

  return (
    <div>
      {/* header */}
      <div style={{ marginBottom: 18 }}>
        {user?.name && (
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 4 }}>
            Hey {user.name} — here's where things stand.
          </div>
        )}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span
            style={{
              fontFamily: "'Spline Sans Mono', monospace",
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            {money(total)}
          </span>
          <span style={{ fontSize: 13, color: C.muted }}>spent so far</span>
        </div>

        {/* honesty bar */}
        {total > 0 && (
          <>
            <div
              style={{
                marginTop: 14,
                height: 14,
                borderRadius: 8,
                overflow: "hidden",
                display: "flex",
                border: `1px solid ${C.line}`,
              }}
              aria-label="Spending by your own ratings"
            >
              {["green", "yellow", "red", "unrated"].map((k) => (
                <div
                  key={k}
                  style={{
                    width: `${(sums[k] / total) * 100}%`,
                    background: k === "unrated" ? C.unrated : ratings[k].color,
                    transition: "width .4s ease",
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
              {["green", "yellow", "red"].map((k) => (
                <span
                  key={k}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12,
                    color: C.muted,
                  }}
                >
                  <Dot color={ratings[k].color} />
                  {ratings[k].label}{" "}
                  <b
                    style={{
                      color: C.ink,
                      fontFamily: "'Spline Sans Mono', monospace",
                      fontWeight: 600,
                    }}
                  >
                    {money(sums[k])}
                  </b>
                </span>
              ))}
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  color: C.muted,
                }}
              >
                <Dot color={C.unrated} /> Unrated{" "}
                <b
                  style={{
                    color: C.ink,
                    fontFamily: "'Spline Sans Mono', monospace",
                    fontWeight: 600,
                  }}
                >
                  {money(sums.unrated)}
                </b>
              </span>
            </div>
          </>
        )}
      </div>

      {!demo && <ConnectBank onLinked={load} />}

      {/* toast = the push notification preview */}
      {toast && (
        <div
          role="status"
          style={{
            background: C.ink,
            color: "#fff",
            padding: "12px 14px",
            borderRadius: 12,
            fontSize: 13,
            lineHeight: 1.4,
            marginBottom: 16,
            boxShadow: "0 8px 24px rgba(28,36,34,.25)",
          }}
        >
          🔔 <b>Hindsight</b> · {toast}
        </div>
      )}

      {loading && (
        <p style={{ color: C.muted, fontSize: 13, textAlign: "center" }}>Loading…</p>
      )}

      {/* unrated queue */}
      {unrated.length > 0 && (
        <section style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 10px" }}>
            Be honest with yourself{" "}
            <span style={{ color: C.muted, fontWeight: 600 }}>
              · {unrated.length} to rate
            </span>
          </h2>
          {unrated.map((t) => (
            <div
              key={t.id}
              style={{
                background: C.card,
                border: `1px solid ${C.line}`,
                borderRadius: 14,
                padding: 14,
                marginBottom: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{t.merchant}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                    {t.desc} · {t.cat}
                    {t.recurring ? " · recurring" : ""}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "'Spline Sans Mono', monospace",
                    fontWeight: 600,
                    fontSize: 15,
                  }}
                >
                  {money(t.amount)}
                </div>
              </div>

              <Memory memory={t.memory} ratings={ratings} />

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {["green", "yellow", "red"].map((k) => {
                  const r = ratings[k];
                  return (
                    <button
                      key={k}
                      className="rateBtn"
                      onClick={() => rate(t.id, k)}
                      style={{
                        flex: 1,
                        padding: "9px 4px",
                        borderRadius: 10,
                        background: r.soft,
                        color: r.color,
                        fontWeight: 700,
                        fontSize: 12.5,
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <Dot color={r.color} /> {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* rated feed */}
      {rated.length > 0 && (
        <section>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 10px" }}>Rated</h2>
          {rated.map((t) => {
            const r = ratings[t.rating];
            return (
              <div
                key={t.id}
                style={{
                  background: C.card,
                  border: `1px solid ${C.line}`,
                  borderLeft: `4px solid ${r.color}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                  marginBottom: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.merchant}</div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                    {t.cat}
                    {t.recurring ? " · recurring" : ""} · {t.date} ·{" "}
                    <span style={{ color: r.color, fontWeight: 700 }}>{r.label}</span>
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "'Spline Sans Mono', monospace",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  {money(t.amount)}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <p
        style={{
          fontSize: 11.5,
          color: C.muted,
          textAlign: "center",
          marginTop: 22,
          lineHeight: 1.5,
        }}
      >
        {demo
          ? "Running in demo mode with sample data. Add Plaid keys in server/.env to connect a real bank (sandbox is free)."
          : "Connected via Plaid. Transactions sync automatically."}
      </p>
    </div>
  );
}
