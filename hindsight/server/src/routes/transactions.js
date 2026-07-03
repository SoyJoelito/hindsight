import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../auth.js";
import { memoryFor, shouldWarn } from "../memory.js";
import * as notify from "../notify.js";

const router = Router();
router.use(requireAuth);

const money = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/* All of this user's transactions, each with its rating and the
   past-self memory for its merchant. */
router.get("/", (req, res) => {
  const txs = db
    .prepare(
      `SELECT t.*, r.rating
       FROM transactions t
       LEFT JOIN ratings r ON r.transaction_id = t.id
       WHERE t.user_id = ?
       ORDER BY t.date DESC, t.id DESC`
    )
    .all(req.userId);

  res.json(
    txs.map((t) => ({
      id: t.id,
      merchant: t.merchant,
      desc: t.description,
      amount: t.amount,
      cat: t.category,
      recurring: !!t.recurring,
      date: t.date,
      rating: t.rating || null,
      memory: t.rating ? null : memoryFor(req.userId, t.merchant),
    }))
  );
});

/* Rate (or re-rate) a purchase. Fires a real notification for
   red-rated recurring charges. */
router.post("/:id/rate", async (req, res) => {
  const { rating } = req.body;
  if (!["green", "yellow", "red"].includes(rating))
    return res.status(400).json({ error: "rating must be green, yellow, or red" });

  const tx = db
    .prepare(`SELECT * FROM transactions WHERE id = ? AND user_id = ?`)
    .get(req.params.id, req.userId);
  if (!tx) return res.status(404).json({ error: "Transaction not found" });

  db.prepare(
    `INSERT INTO ratings (user_id, transaction_id, merchant, rating)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(transaction_id) DO UPDATE SET rating = excluded.rating, rated_at = datetime('now')`
  ).run(req.userId, tx.id, tx.merchant, rating);

  let warned = false;
  let message = null;
  if (rating === "red" && tx.recurring) {
    warned = true;
    // the user's own word for red purchases, so the app speaks their language
    const row = db
      .prepare(`SELECT value FROM settings WHERE user_id = ? AND key = 'appearance'`)
      .get(req.userId);
    const label = row ? JSON.parse(row.value).ratings.red.label : "Regret it";
    message = notify.messages.redRecurring(tx.merchant, label);
    await notify.send(req.userId, { title: "Hindsight", body: message });
  }

  res.json({ ok: true, warned, message, willWarnNextTime: shouldWarn(req.userId, tx.merchant) });
});

/*
 * Spending breakdown: every category this user's money went to, with the
 * purchases inside. Categories are the user's own — they can rename where
 * any purchase lives, so the list is shaped by each buyer over time.
 */
router.get("/breakdown", (req, res) => {
  const txs = db
    .prepare(
      `SELECT t.*, r.rating
       FROM transactions t
       LEFT JOIN ratings r ON r.transaction_id = t.id
       WHERE t.user_id = ?
       ORDER BY t.date DESC, t.id DESC`
    )
    .all(req.userId);

  const cats = {};
  for (const t of txs) {
    const key = t.category || "Other";
    cats[key] ??= { category: key, total: 0, count: 0, transactions: [] };
    cats[key].total += t.amount;
    cats[key].count++;
    cats[key].transactions.push({
      id: t.id,
      merchant: t.merchant,
      desc: t.description,
      amount: t.amount,
      date: t.date,
      recurring: !!t.recurring,
      rating: t.rating || null,
    });
  }
  res.json(Object.values(cats).sort((a, b) => b.total - a.total));
});

/*
 * Recurring purchases: merchants that either carry the recurring flag or
 * have charged this user in 2+ different months (so Plaid data works even
 * before its recurring flag is wired up). Includes a yearly cost estimate —
 * that's where the "oh no" moment lives.
 */
router.get("/recurring", (req, res) => {
  const rows = db
    .prepare(
      `SELECT t.merchant, t.category,
              COUNT(*) AS times,
              SUM(t.amount) AS total,
              MAX(t.date) AS last_date,
              AVG(t.amount) AS avg_amount,
              MAX(t.recurring) AS flagged,
              COUNT(DISTINCT strftime('%Y-%m', t.date)) AS months
       FROM transactions t
       WHERE t.user_id = ?
       GROUP BY t.merchant
       HAVING flagged = 1 OR months >= 2
       ORDER BY total DESC`
    )
    .all(req.userId);

  res.json(
    rows.map((r) => {
      const perMonth = r.total / Math.max(r.months, 1);
      const ratings = db
        .prepare(
          `SELECT rating FROM ratings WHERE user_id = ? AND merchant = ? ORDER BY rated_at ASC`
        )
        .all(req.userId, r.merchant)
        .map((x) => x.rating);
      return {
        merchant: r.merchant,
        category: r.category,
        times: r.times,
        total: r.total,
        lastDate: r.last_date,
        perMonth,
        perYear: perMonth * 12,
        ratings,
      };
    })
  );
});

/* Move a purchase into a different category — or a brand new one the
   user just made up. This is how categories get shaped per buyer. */
router.patch("/:id/category", (req, res) => {
  const category = String(req.body?.category || "").trim().slice(0, 40);
  if (!category) return res.status(400).json({ error: "Give the category a name first." });

  const result = db
    .prepare(`UPDATE transactions SET category = ? WHERE id = ? AND user_id = ?`)
    .run(category, req.params.id, req.userId);
  if (result.changes === 0)
    return res.status(404).json({ error: "Transaction not found" });
  res.json({ ok: true, category });
});

/*
 * Monthly honesty report: for each month, total spending per rating tier,
 * plus the biggest regret and proudest purchase of that month.
 */
router.get("/report/monthly", (req, res) => {
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m', t.date) AS month,
              COALESCE(r.rating, 'unrated') AS rating,
              SUM(t.amount) AS total,
              COUNT(*) AS n
       FROM transactions t
       LEFT JOIN ratings r ON r.transaction_id = t.id
       WHERE t.user_id = ?
       GROUP BY month, COALESCE(r.rating, 'unrated')
       ORDER BY month ASC`
    )
    .all(req.userId);

  const biggest = db
    .prepare(
      `SELECT strftime('%Y-%m', t.date) AS month, r.rating, t.merchant, t.amount,
              MAX(t.amount) AS _max
       FROM transactions t
       JOIN ratings r ON r.transaction_id = t.id
       WHERE t.user_id = ? AND r.rating IN ('red', 'green')
       GROUP BY month, r.rating`
    )
    .all(req.userId);

  const months = {};
  for (const r of rows) {
    months[r.month] ??= {
      month: r.month,
      totals: { green: 0, yellow: 0, red: 0, unrated: 0 },
      counts: { green: 0, yellow: 0, red: 0, unrated: 0 },
      biggestRegret: null,
      proudest: null,
    };
    months[r.month].totals[r.rating] = r.total;
    months[r.month].counts[r.rating] = r.n;
  }
  for (const b of biggest) {
    if (!months[b.month]) continue;
    const entry = { merchant: b.merchant, amount: b.amount };
    if (b.rating === "red") months[b.month].biggestRegret = entry;
    else months[b.month].proudest = entry;
  }

  res.json(Object.values(months));
});

/* Totals by rating (all time). */
router.get("/report", (req, res) => {
  const rows = db
    .prepare(
      `SELECT COALESCE(r.rating, 'unrated') AS rating, SUM(t.amount) AS total, COUNT(*) AS n
       FROM transactions t
       LEFT JOIN ratings r ON r.transaction_id = t.id
       WHERE t.user_id = ?
       GROUP BY COALESCE(r.rating, 'unrated')`
    )
    .all(req.userId);
  res.json(rows);
});

export { money };
export default router;
