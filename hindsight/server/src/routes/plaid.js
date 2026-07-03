import { Router } from "express";
import db from "../db.js";
import { plaidClient, DEMO_MODE } from "../plaid.js";
import { requireAuth } from "../auth.js";
import { memoryFor, shouldWarn } from "../memory.js";
import * as notify from "../notify.js";

const router = Router();
router.use(requireAuth);

/*
 * Flow (standard Plaid Link handshake):
 * 1. Client asks for a link_token          → POST /api/plaid/create_link_token
 * 2. User completes Plaid Link in the UI, we get a public_token
 * 3. Client trades it for an access_token  → POST /api/plaid/exchange_public_token
 * 4. We pull transactions with /sync       → POST /api/plaid/sync
 *
 * In sandbox, Plaid's fake bank accepts user_good / pass_good and returns
 * realistic fake transactions — perfect for building.
 */

router.post("/create_link_token", async (req, res) => {
  if (DEMO_MODE)
    return res.status(400).json({
      error: "DEMO_MODE is on. Set DEMO_MODE=false and add Plaid keys in server/.env to connect a bank.",
    });
  try {
    const resp = await plaidClient().linkTokenCreate({
      user: { client_user_id: String(req.userId) },
      client_name: "Hindsight",
      products: ["transactions"],
      country_codes: ["US"],
      language: "en",
    });
    res.json({ link_token: resp.data.link_token });
  } catch (e) {
    console.error(e.response?.data || e);
    res.status(500).json({ error: "Failed to create link token. Check your Plaid keys." });
  }
});

router.post("/exchange_public_token", async (req, res) => {
  if (DEMO_MODE) return res.status(400).json({ error: "DEMO_MODE is on." });
  try {
    const { public_token, institution } = req.body;
    const resp = await plaidClient().itemPublicTokenExchange({ public_token });
    db.prepare(
      `INSERT OR REPLACE INTO plaid_items (user_id, item_id, access_token, institution) VALUES (?, ?, ?, ?)`
    ).run(req.userId, resp.data.item_id, resp.data.access_token, institution || null);
    res.json({ ok: true });
  } catch (e) {
    console.error(e.response?.data || e);
    res.status(500).json({ error: "Token exchange failed." });
  }
});

/* Pull new/updated transactions for every connected bank. */
router.post("/sync", async (req, res) => {
  if (DEMO_MODE) return res.json({ ok: true, added: 0, demo: true });
  try {
    const items = db.prepare(`SELECT * FROM plaid_items WHERE user_id = ?`).all(req.userId);
    let added = 0;

    const insert = db.prepare(
      `INSERT OR IGNORE INTO transactions
       (user_id, plaid_tx_id, merchant, description, amount, category, recurring, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const item of items) {
      let cursor = item.cursor || undefined;
      let hasMore = true;
      while (hasMore) {
        const resp = await plaidClient().transactionsSync({
          access_token: item.access_token,
          cursor,
        });
        const d = resp.data;
        for (const tx of d.added) {
          if (tx.amount <= 0) continue; // skip income/refunds for the spending view
          const merchant = tx.merchant_name || tx.name || "Unknown";
          const category = tx.personal_finance_category?.primary
            ?.replaceAll("_", " ")
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase()) || "Other";
          const r = insert.run(
            req.userId,
            tx.transaction_id,
            merchant,
            tx.name,
            tx.amount,
            category,
            0,
            tx.date
          );
          added += r.changes;

          // The whole point of the app: a new charge from a merchant this
          // person has regretted before gets a heads-up, in their voice.
          if (r.changes > 0 && shouldWarn(req.userId, merchant)) {
            const m = memoryFor(req.userId, merchant);
            const amount = tx.amount.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            });
            await notify.send(req.userId, {
              title: "Hindsight",
              body: notify.messages.headsUp(merchant, amount, m.redCount, m.history.length),
            });
          }
        }
        cursor = d.next_cursor;
        hasMore = d.has_more;
      }
      db.prepare(`UPDATE plaid_items SET cursor = ? WHERE id = ?`).run(cursor, item.id);
    }
    res.json({ ok: true, added });
  } catch (e) {
    console.error(e.response?.data || e);
    res.status(500).json({ error: "Sync failed." });
  }
});

export default router;
