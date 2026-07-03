import db from "./db.js";

/*
 * Seeds the database once with the prototype's sample data, including
 * historical rated purchases from past months so the "past self" memory
 * has something real to compute from.
 */
export function seedDemo(userId) {
  const count = db.prepare(`SELECT COUNT(*) AS n FROM transactions WHERE user_id = ?`).get(userId).n;
  if (count > 0) return;

  const insertTx = db.prepare(
    `INSERT INTO transactions (user_id, merchant, description, amount, category, recurring, date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertRating = db.prepare(
    `INSERT INTO ratings (user_id, transaction_id, merchant, rating, rated_at) VALUES (?, ?, ?, ?, ?)`
  );

  // ── past months: already-rated history that powers the mirror ──
  const history = [
    ["DoorDash", "Delivery · dinner", 38.4, "Food & Drink", 1, "2026-04-11", "red"],
    ["DoorDash", "Delivery · lunch", 27.9, "Food & Drink", 1, "2026-05-02", "red"],
    ["DoorDash", "Delivery · dinner", 44.1, "Food & Drink", 1, "2026-05-19", "yellow"],
    ["DoorDash", "Delivery · dinner", 35.6, "Food & Drink", 1, "2026-06-08", "red"],
    ["Trader Joe's", "Groceries", 92.11, "Groceries", 1, "2026-04-14", "green"],
    ["Trader Joe's", "Groceries", 78.45, "Groceries", 1, "2026-05-12", "green"],
    ["Trader Joe's", "Groceries", 88.7, "Groceries", 1, "2026-06-10", "green"],
    ["Peak Fitness", "Monthly membership", 34.0, "Health", 1, "2026-05-01", "green"],
    ["Peak Fitness", "Monthly membership", 34.0, "Health", 1, "2026-06-01", "yellow"],
    ["StreamFlix", "Monthly subscription", 15.99, "Entertainment", 1, "2026-05-04", "yellow"],
    ["StreamFlix", "Monthly subscription", 15.99, "Entertainment", 1, "2026-06-04", "red"],
  ];
  for (const [m, d, amt, cat, rec, date, rating] of history) {
    const { lastInsertRowid } = insertTx.run(userId, m, d, amt, cat, rec, date);
    insertRating.run(userId, lastInsertRowid, m, rating, date + " 12:00:00");
  }

  // ── this month: fresh transactions, mostly unrated ──
  const thisMonth = [
    ["DoorDash", "Delivery · dinner", 41.87, "Food & Drink", 1, "2026-07-01", null],
    ["ANA Airways", "Flight · PHL → Tokyo", 842.0, "Travel", 0, "2026-07-01", null],
    ["StreamFlix", "Monthly subscription", 15.99, "Entertainment", 1, "2026-07-01", null],
    ["Trader Joe's", "Groceries", 86.32, "Groceries", 1, "2026-07-01", "green"],
    ["Peak Fitness", "Monthly membership", 34.0, "Health", 1, "2026-07-01", "green"],
    ["Corner Café", "Coffee ×4 this week", 22.5, "Food & Drink", 1, "2026-07-02", "yellow"],
    ["Impulse Gadget Co.", "LED galaxy projector", 59.99, "Shopping", 0, "2026-07-02", "red"],
  ];
  for (const [m, d, amt, cat, rec, date, rating] of thisMonth) {
    const { lastInsertRowid } = insertTx.run(userId, m, d, amt, cat, rec, date);
    if (rating) insertRating.run(userId, lastInsertRowid, m, rating, date + " 18:00:00");
  }

  console.log("🌱 Demo data seeded.");
}
