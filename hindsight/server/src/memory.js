import db from "./db.js";

/*
 * The "your past self" mirror. Given a user + merchant, look up every
 * rating they've given that merchant and summarize it. Powers the chip
 * in the UI and the pre-purchase heads-up notification.
 */
export function memoryFor(userId, merchant) {
  const rows = db
    .prepare(
      `SELECT rating FROM ratings WHERE user_id = ? AND merchant = ? ORDER BY rated_at ASC`
    )
    .all(userId, merchant);

  if (rows.length < 2) return null; // not enough history to be meaningful

  const hist = rows.map((r) => r.rating);
  const reds = hist.filter((r) => r === "red").length;
  const greens = hist.filter((r) => r === "green").length;

  let note;
  if (reds >= hist.length / 2)
    note = `You regretted ${reds} of your last ${hist.length} ${merchant} purchases.`;
  else if (greens >= hist.length / 2)
    note = `You've been glad about ${merchant} ${greens} of ${hist.length} times.`;
  else note = `Mixed feelings — your ${merchant} history is split.`;

  return { merchant, history: hist, note, redCount: reds, greenCount: greens };
}

/* Should a new charge from this merchant trigger a heads-up? */
export function shouldWarn(userId, merchant) {
  const m = memoryFor(userId, merchant);
  return !!m && m.redCount >= m.history.length / 2;
}
