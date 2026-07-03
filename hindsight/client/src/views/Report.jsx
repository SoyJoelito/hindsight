import { useEffect, useState } from "react";
import { fetchMonthlyReport } from "../api.js";
import { C } from "../theme.js";

const money = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const monthName = (ym) => {
  const [y, m] = ym.split("-");
  return new Date(y, m - 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/* One friendly sentence comparing the two most recent months. */
function trendLine(months, ratings) {
  if (months.length < 2) return null;
  const [prev, curr] = months.slice(-2);
  const share = (m) => {
    const total = Object.values(m.totals).reduce((a, b) => a + b, 0);
    return pct(m.totals.red, total);
  };
  const a = share(prev);
  const b = share(curr);
  const label = ratings.red.label.toLowerCase();
  if (b < a)
    return `Your "${label}" spending dropped from ${a}% to ${b}% of the month. Keep going.`;
  if (b > a)
    return `Your "${label}" spending rose from ${a}% to ${b}% this month. Worth a look below.`;
  return `Your "${label}" spending held steady at ${b}%.`;
}

export default function Report({ ratings }) {
  const [months, setMonths] = useState(null);

  useEffect(() => {
    fetchMonthlyReport().then(setMonths);
  }, []);

  if (!months)
    return <p style={{ color: C.muted, fontSize: 13, textAlign: "center" }}>Loading…</p>;
  if (months.length === 0)
    return (
      <p style={{ color: C.muted, fontSize: 13, textAlign: "center" }}>
        Nothing to report yet — rate a few purchases first.
      </p>
    );

  const maxTotal = Math.max(
    ...months.map((m) => Object.values(m.totals).reduce((a, b) => a + b, 0))
  );
  const trend = trendLine(months, ratings);

  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 4px" }}>
        Your honesty report
      </h2>
      <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 14px", lineHeight: 1.4 }}>
        Each bar is a month of spending, colored by your own ratings.
      </p>

      {trend && (
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.line}`,
            borderRadius: 12,
            padding: "12px 14px",
            fontSize: 13.5,
            lineHeight: 1.45,
            marginBottom: 16,
          }}
        >
          {trend}
        </div>
      )}

      {[...months].reverse().map((m) => {
        const total = Object.values(m.totals).reduce((a, b) => a + b, 0);
        return (
          <div
            key={m.month}
            style={{
              background: C.card,
              border: `1px solid ${C.line}`,
              borderRadius: 14,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 14 }}>{monthName(m.month)}</div>
              <div
                style={{
                  fontFamily: "'Spline Sans Mono', monospace",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {money(total)}
              </div>
            </div>

            {/* stacked bar, width scaled against the biggest month */}
            <div
              style={{
                height: 16,
                borderRadius: 8,
                overflow: "hidden",
                display: "flex",
                width: `${Math.max((total / maxTotal) * 100, 12)}%`,
                border: `1px solid ${C.line}`,
              }}
              aria-label={`${monthName(m.month)} spending by rating`}
            >
              {["green", "yellow", "red", "unrated"].map((k) => (
                <div
                  key={k}
                  style={{
                    width: `${pct(m.totals[k], total)}%`,
                    background: k === "unrated" ? C.unrated : ratings[k].color,
                  }}
                />
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
              {["green", "yellow", "red"].map((k) =>
                m.totals[k] > 0 ? (
                  <span
                    key={k}
                    style={{
                      fontSize: 12,
                      color: C.muted,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 8,
                        background: ratings[k].color,
                        display: "inline-block",
                      }}
                    />
                    {ratings[k].label}{" "}
                    <b style={{ color: C.ink }}>{pct(m.totals[k], total)}%</b>
                  </span>
                ) : null
              )}
            </div>

            {(m.biggestRegret || m.proudest) && (
              <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                {m.proudest && (
                  <div style={{ fontSize: 12.5, color: C.ink }}>
                    <span style={{ color: ratings.green.color, fontWeight: 700 }}>
                      Best call:
                    </span>{" "}
                    {m.proudest.merchant} · {money(m.proudest.amount)}
                  </div>
                )}
                {m.biggestRegret && (
                  <div style={{ fontSize: 12.5, color: C.ink }}>
                    <span style={{ color: ratings.red.color, fontWeight: 700 }}>
                      Biggest regret:
                    </span>{" "}
                    {m.biggestRegret.merchant} · {money(m.biggestRegret.amount)}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
