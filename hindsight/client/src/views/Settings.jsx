import { useState } from "react";
import { saveAppearance, enablePushReminders, sendTestReminder } from "../api.js";
import { C, PRESETS, TEXT_SIZES, soften } from "../theme.js";

/*
 * Everything here edits a draft copy and saves on "Save changes" —
 * with a live preview card so people see exactly what they're choosing.
 */
export default function Settings({ appearance, onSaved }) {
  const [draft, setDraft] = useState(structuredClone(appearance));
  const [saved, setSaved] = useState(false);
  const [reminderStatus, setReminderStatus] = useState(null);

  const turnOnReminders = async () => {
    setReminderStatus("Setting up…");
    const r = await enablePushReminders();
    setReminderStatus(
      r.ok
        ? "Reminders are on for this device. Try the test below."
        : r.reason
    );
  };

  const testReminder = async () => {
    setReminderStatus("Sending…");
    const r = await sendTestReminder();
    setReminderStatus(
      r.push > 0
        ? "Sent! Check your notifications."
        : "Sent to the server log — turn on reminders above to get it on this device."
    );
  };

  const setRating = (k, field, value) =>
    setDraft((d) => ({
      ...d,
      preset: field === "color" ? "custom" : d.preset,
      ratings: { ...d.ratings, [k]: { ...d.ratings[k], [field]: value } },
    }));

  const applyPreset = (id) =>
    setDraft((d) => ({
      ...d,
      preset: id,
      ratings: {
        green: { ...d.ratings.green, color: PRESETS[id].ratings.green.color },
        yellow: { ...d.ratings.yellow, color: PRESETS[id].ratings.yellow.color },
        red: { ...d.ratings.red, color: PRESETS[id].ratings.red.color },
      },
    }));

  const save = async () => {
    const clean = await saveAppearance(draft);
    onSaved(clean);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const inputStyle = {
    width: "100%",
    padding: "9px 10px",
    borderRadius: 10,
    border: `1px solid ${C.line}`,
    fontSize: 13.5,
    fontFamily: "inherit",
    color: C.ink,
    background: C.card,
    boxSizing: "border-box",
  };

  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 4px" }}>Make it yours</h2>
      <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 14px", lineHeight: 1.4 }}>
        Choose the colors and words that feel right to you. Labels always appear next to
        colors, so any palette works.
      </p>

      {/* presets */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {Object.entries(PRESETS).map(([id, p]) => (
          <button
            key={id}
            className="rateBtn"
            onClick={() => applyPreset(id)}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: "inherit",
              background: draft.preset === id ? C.ink : C.card,
              color: draft.preset === id ? "#fff" : C.ink,
              border: `1px solid ${draft.preset === id ? C.ink : C.line}`,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {["green", "yellow", "red"].map((k) => (
              <span
                key={k}
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 9,
                  background: p.ratings[k].color,
                  display: "inline-block",
                }}
              />
            ))}
            {p.name}
          </button>
        ))}
      </div>

      {/* per-tier editors */}
      {["green", "yellow", "red"].map((k) => {
        const r = draft.ratings[k];
        return (
          <div
            key={k}
            style={{
              background: C.card,
              border: `1px solid ${C.line}`,
              borderLeft: `4px solid ${r.color}`,
              borderRadius: 12,
              padding: 12,
              marginBottom: 10,
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <label
              style={{
                position: "relative",
                width: 44,
                height: 44,
                borderRadius: 12,
                background: r.color,
                cursor: "pointer",
                flexShrink: 0,
                border: `1px solid ${C.line}`,
              }}
              title="Pick a color"
            >
              <input
                type="color"
                value={r.color}
                onChange={(e) => setRating(k, "color", e.target.value)}
                aria-label={`Color for "${r.label}"`}
                style={{ opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
              />
            </label>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: C.muted,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                What do you call these purchases?
              </div>
              <input
                style={inputStyle}
                value={r.label}
                maxLength={24}
                onChange={(e) => setRating(k, "label", e.target.value)}
                aria-label={`Label for the ${k} rating`}
              />
            </div>
          </div>
        );
      })}

      {/* live preview */}
      <div
        style={{
          background: C.paper,
          border: `1px dashed ${C.line}`,
          borderRadius: 12,
          padding: 12,
          margin: "14px 0",
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
          Preview
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["green", "yellow", "red"].map((k) => {
            const r = draft.ratings[k];
            return (
              <span
                key={k}
                style={{
                  flex: 1,
                  padding: "9px 4px",
                  borderRadius: 10,
                  background: soften(r.color),
                  color: r.color,
                  fontWeight: 700,
                  fontSize: 12.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 8,
                    background: r.color,
                    display: "inline-block",
                  }}
                />
                {r.label || "…"}
              </span>
            );
          })}
        </div>
      </div>

      {/* text size */}
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
        Text size
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {TEXT_SIZES.map((s) => (
          <button
            key={s.value}
            className="rateBtn"
            onClick={() => setDraft((d) => ({ ...d, textScale: s.value }))}
            style={{
              flex: 1,
              padding: "9px 4px",
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: "inherit",
              background: draft.textScale === s.value ? C.ink : C.card,
              color: draft.textScale === s.value ? "#fff" : C.ink,
              border: `1px solid ${draft.textScale === s.value ? C.ink : C.line}`,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* reminders */}
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
        Reminders
      </div>
      <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 10px", lineHeight: 1.45 }}>
        When a purchase you've regretted before shows up again, Hindsight gives you a
        heads-up — like a friend who remembers so you don't have to.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          className="rateBtn"
          onClick={turnOnReminders}
          style={{
            flex: 1,
            padding: "11px 4px",
            borderRadius: 10,
            fontSize: 12.5,
            fontWeight: 700,
            fontFamily: "inherit",
            background: C.card,
            color: C.ink,
            border: `1px solid ${C.line}`,
          }}
        >
          🔔 Turn on reminders
        </button>
        <button
          className="rateBtn"
          onClick={testReminder}
          style={{
            flex: 1,
            padding: "11px 4px",
            borderRadius: 10,
            fontSize: 12.5,
            fontWeight: 700,
            fontFamily: "inherit",
            background: C.card,
            color: C.ink,
            border: `1px solid ${C.line}`,
          }}
        >
          Send a test
        </button>
      </div>
      {reminderStatus && (
        <p role="status" style={{ fontSize: 12.5, color: C.ink, margin: "0 0 16px", lineHeight: 1.4 }}>
          {reminderStatus}
        </p>
      )}
      {!reminderStatus && <div style={{ marginBottom: 16 }} />}

      <button
        className="rateBtn"
        onClick={save}
        style={{
          width: "100%",
          padding: 13,
          borderRadius: 12,
          background: C.ink,
          color: "#fff",
          fontWeight: 800,
          fontSize: 14,
          fontFamily: "inherit",
        }}
      >
        {saved ? "Saved ✓" : "Save changes"}
      </button>
    </div>
  );
}
