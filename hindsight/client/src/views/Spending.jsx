import { useEffect, useState, useCallback } from "react";
import { fetchBreakdown, fetchRecurring, changeCategory } from "../api.js";
import { C } from "../theme.js";

const money = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const prettyDate = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

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

/* Small inline picker: move a purchase to any existing category, or make
   a new one. This is how the category list becomes the buyer's own. */
function CategoryPicker({ tx, categories, onMoved, onCancel }) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const move = async (category) => {
    await changeCategory(tx.id, category);
    onMoved();
  };

  return (
    <div
      style={{
        marginTop: 8,
        padding: 10,
        borderRadius: 10,
        background: C.paper,
        border: `1px solid ${C.line}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: C.muted,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        Move "{tx.merchant}" to…
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {categories.map((c) => (
          <button
            key={c}
            className="rateBtn"
            onClick={() => move(c)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "inherit",
              background: C.card,
              color: C.ink,
              border: `1px solid ${C.line}`,
            }}
          >
            {c}
          </button>
        ))}
        {!creating ? (
          <button
            className="rateBtn"
            onClick={() => setCreating(true)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "inherit",
              background: C.ink,
              color: "#fff",
            }}
          >
            + New category
          </button>
        ) : (
          <span style={{ display: "flex", gap: 6, width: "100%", marginTop: 4 }}>
            <input
              autoFocus
              placeholder="Name it anything — 'Kids', 'Vices', 'Japan trip'…"
              value={newName}
              maxLength={40}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && newName.trim() && move(newName)}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 8,
                border: `1px solid ${C.line}`,
                fontSize: 12.5,
                fontFamily: "inherit",
                color: C.ink,
              }}
            />
            <button
              className="rateBtn"
              onClick={() => newName.trim() && move(newName)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "inherit",
                background: C.ink,
                color: "#fff",
              }}
            >
              Move
            </button>
          </span>
        )}
      </div>
      <button
        onClick={onCancel}
        style={{
          marginTop: 8,
          border: "none",
          background: "transparent",
          color: C.muted,
          fontSize: 11.5,
          fontFamily: "inherit",
          cursor: "pointer",
          textDecoration: "underline",
          padding: 0,
        }}
      >
        Never mind
      </button>
    </div>
  );
}

export default function Spending({ ratings }) {
  const [cats, setCats] = useState(null);
  const [recurring, setRecurring] = useState(null);
  const [open, setOpen] = useState({}); // which categories are expanded
  const [moving, setMoving] = useState(null); // tx id being recategorized

  const load = useCallback(async () => {
    const [c, r] = await Promise.all([fetchBreakdown(), fetchRecurring()]);
    setCats(c);
    setRecurring(r);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!cats || !recurring)
    return <p style={{ color: C.muted, fontSize: 13, textAlign: "center" }}>Loading…</p>;

  const grandTotal = cats.reduce((s, c) => s + c.total, 0);
  const categoryNames = cats.map((c) => c.category);
  const recurringYearly = recurring.reduce((s, r) => s + r.perYear, 0);

  return (
    <div>
      {/* ————— recurring ————— */}
      <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 4px" }}>
        Recurring charges
      </h2>
      <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 12px", lineHeight: 1.45 }}>
        The quiet ones that come back every month. Together they run about{" "}
        <b style={{ color: C.ink }}>{money(recurringYearly)}</b> a year.
      </p>

      {recurring.length === 0 && (
        <p style={{ fontSize: 12.5, color: C.muted }}>
          Nothing recurring spotted yet — they'll show up here as charges repeat.
        </p>
      )}
      {recurring.map((r) => (
        <div
          key={r.merchant}
          style={{
            background: C.card,
            border: `1px solid ${C.line}`,
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
            <div style={{ fontWeight: 700, fontSize: 14 }}>{r.merchant}</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
              {r.category} · {r.times}× · last {prettyDate(r.lastDate)}
            </div>
            {r.ratings.length > 0 && (
              <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
                {r.ratings.map((rt, i) => (
                  <Dot key={i} color={ratings[rt].color} size={7} />
                ))}
              </div>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontFamily: "'Spline Sans Mono', monospace",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {money(r.perMonth)}
              <span style={{ fontSize: 11, color: C.muted }}>/mo</span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              ≈ {money(r.perYear)}/yr
            </div>
          </div>
        </div>
      ))}

      {/* ————— by category ————— */}
      <h2 style={{ fontSize: 15, fontWeight: 800, margin: "22px 0 4px" }}>
        Where it all went
      </h2>
      <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 12px", lineHeight: 1.45 }}>
        Tap a category to see every purchase inside. Tap a purchase's category tag to
        move it — your categories, your rules.
      </p>

      {cats.map((c) => {
        const isOpen = !!open[c.category];
        const share = grandTotal > 0 ? Math.round((c.total / grandTotal) * 100) : 0;
        return (
          <div
            key={c.category}
            style={{
              background: C.card,
              border: `1px solid ${C.line}`,
              borderRadius: 12,
              marginBottom: 8,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setOpen((o) => ({ ...o, [c.category]: !isOpen }))}
              aria-expanded={isOpen}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                color: C.ink,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 14 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-block",
                      transform: isOpen ? "rotate(90deg)" : "none",
                      transition: "transform .15s ease",
                      marginRight: 8,
                      fontSize: 12,
                      color: C.muted,
                    }}
                  >
                    ▶
                  </span>
                  {c.category}
                  <span style={{ color: C.muted, fontWeight: 600, fontSize: 12 }}>
                    {" "}
                    · {c.count} {c.count === 1 ? "purchase" : "purchases"}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "'Spline Sans Mono', monospace",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  {money(c.total)}
                </div>
              </div>
              {/* share-of-spending bar */}
              <div
                style={{
                  marginTop: 8,
                  height: 6,
                  borderRadius: 4,
                  background: C.paper,
                  overflow: "hidden",
                }}
                aria-label={`${share}% of total spending`}
              >
                <div
                  style={{
                    width: `${share}%`,
                    height: "100%",
                    background: C.ink,
                    opacity: 0.75,
                  }}
                />
              </div>
            </button>

            {isOpen && (
              <div style={{ padding: "0 14px 12px" }}>
                {c.transactions.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      borderTop: `1px solid ${C.line}`,
                      padding: "10px 0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
                      >
                        <Dot color={t.rating ? ratings[t.rating].color : C.unrated} />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 13,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {t.merchant}
                          </div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                            {prettyDate(t.date)}
                            {t.recurring ? " · recurring" : ""} ·{" "}
                            <button
                              onClick={() => setMoving(moving === t.id ? null : t.id)}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: C.muted,
                                fontSize: 11,
                                fontFamily: "inherit",
                                cursor: "pointer",
                                textDecoration: "underline",
                                padding: 0,
                              }}
                            >
                              move category
                            </button>
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          fontFamily: "'Spline Sans Mono', monospace",
                          fontWeight: 600,
                          fontSize: 13,
                          flexShrink: 0,
                        }}
                      >
                        {money(t.amount)}
                      </div>
                    </div>
                    {moving === t.id && (
                      <CategoryPicker
                        tx={t}
                        categories={categoryNames.filter((n) => n !== c.category)}
                        onMoved={() => {
                          setMoving(null);
                          load();
                        }}
                        onCancel={() => setMoving(null)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
