import { DatabaseSync } from "node:sqlite"; // built into Node 22.5+, no install needed
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(path.join(__dirname, "..", "hindsight.db"));
db.exec("PRAGMA journal_mode = WAL;");

/*
 * Multi-user schema. Every piece of data belongs to a user.
 * ratings is still the heart of the product: one row per honest judgment.
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,       -- scrypt salt:hash
    name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS plaid_items (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    item_id TEXT UNIQUE NOT NULL,
    access_token TEXT NOT NULL,        -- encrypt at rest before production!
    institution TEXT,
    cursor TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    plaid_tx_id TEXT UNIQUE,           -- null for demo-seeded rows
    merchant TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    category TEXT,
    recurring INTEGER DEFAULT 0,
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    transaction_id INTEGER NOT NULL REFERENCES transactions(id),
    merchant TEXT NOT NULL,            -- denormalized for fast history lookups
    rating TEXT NOT NULL CHECK (rating IN ('green','yellow','red')),
    rated_at TEXT DEFAULT (datetime('now')),
    UNIQUE (transaction_id)
  );

  -- per-user preferences (rating colors, labels, text size)
  CREATE TABLE IF NOT EXISTS settings (
    user_id INTEGER NOT NULL REFERENCES users(id),
    key TEXT NOT NULL,
    value TEXT NOT NULL,               -- JSON
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, key)
  );

  -- app-wide config (e.g. auto-generated web-push VAPID keys)
  CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- one row per device that turned on push reminders
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    subscription TEXT NOT NULL,        -- JSON from the browser's Push API
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE (user_id, subscription)
  );

  CREATE INDEX IF NOT EXISTS idx_ratings_user_merchant ON ratings(user_id, merchant);
  CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, date);
`);

export default db;
