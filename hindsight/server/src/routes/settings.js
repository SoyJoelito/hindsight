import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();
router.use(requireAuth);

/*
 * User-customizable look & language for the three rating tiers.
 * The keys (green/yellow/red) never change — they're internal IDs —
 * but the user controls what each one looks like and what it's called.
 */
export const DEFAULT_APPEARANCE = {
  preset: "classic",
  textScale: 1, // 1 = normal, 1.15 = large, 1.3 = extra large
  ratings: {
    green: { color: "#2E7D5B", label: "Worth it" },
    yellow: { color: "#D99A1F", label: "It's fine" },
    red: { color: "#C0432C", label: "Regret it" },
  },
};

const HEX = /^#[0-9a-fA-F]{6}$/;

function validate(appearance) {
  const out = structuredClone(DEFAULT_APPEARANCE);
  if (typeof appearance !== "object" || !appearance) return out;
  if (typeof appearance.preset === "string") out.preset = appearance.preset.slice(0, 40);
  if ([1, 1.15, 1.3].includes(appearance.textScale)) out.textScale = appearance.textScale;
  for (const k of ["green", "yellow", "red"]) {
    const r = appearance.ratings?.[k];
    if (!r) continue;
    if (typeof r.color === "string" && HEX.test(r.color)) out.ratings[k].color = r.color;
    if (typeof r.label === "string" && r.label.trim())
      out.ratings[k].label = r.label.trim().slice(0, 24);
  }
  return out;
}

router.get("/appearance", (req, res) => {
  const row = db.prepare(`SELECT value FROM settings WHERE user_id = ? AND key = 'appearance'`).get(req.userId);
  res.json(row ? JSON.parse(row.value) : DEFAULT_APPEARANCE);
});

router.put("/appearance", (req, res) => {
  const clean = validate(req.body);
  db.prepare(
    `INSERT INTO settings (user_id, key, value) VALUES (?, 'appearance', ?)
     ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  ).run(req.userId, JSON.stringify(clean));
  res.json(clean);
});

export default router;
