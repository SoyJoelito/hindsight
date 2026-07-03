# Hindsight

A spending accountability app. Transactions arrive from your bank, and *you* are the judge: rate every purchase green ("worth it"), yellow ("it's fine"), or red ("regret it"). Next time you spend at a merchant you've rated before, Hindsight shows you your own history — and warns you before the regret does.

## Quick start (2 minutes, no accounts needed)

Requires Node.js 22.5 or newer (`node -v` to check — the database uses Node's built-in SQLite).

```bash
# terminal 1 — API server
cd server
cp .env.example .env        # DEMO_MODE=true by default
npm install
npm run dev                 # → http://localhost:4000

# terminal 2 — web app
cd client
npm install
npm run dev                 # → http://localhost:5173
```

Open http://localhost:5173 and create an account (any email works locally). Demo mode seeds three months of sample history, so the "Your past self" mirror already has data. Rate the DoorDash charge red and watch the notification preview fire.

## Connecting real banks (Plaid sandbox — free)

1. Sign up at https://dashboard.plaid.com (free) and grab your **client_id** and **sandbox secret**.
2. In `server/.env` set `DEMO_MODE=false`, paste your keys, keep `PLAID_ENV=sandbox`.
3. Delete `server/hindsight.db` (to clear the demo data) and restart the server.
4. In the app, click **Connect your bank**, pick any institution, and log in with Plaid's sandbox credentials: username `user_good`, password `pass_good`.
5. Transactions sync automatically. Rate away.

Sandbox banks are fake but behave like real ones. When you're ready for real accounts, Plaid moves you to Development (free, limited real accounts) and then Production (paid per connected account).

## How it's organized

```
server/                Express API + SQLite (via node:sqlite, zero native deps)
  src/db.js            schema: plaid_items, transactions, ratings
  src/memory.js        the "past self" logic — the heart of the product
  src/notify.js        notification stub (swap in Firebase/Resend here)
  src/demo.js          seeds sample data in demo mode
  src/routes/plaid.js  link token, token exchange, transaction sync
  src/routes/transactions.js  list, rate, monthly report
client/                Vite + React app (your prototype, wired to the API)
```

## Design decisions worth knowing

**Ratings live in their own table.** One row per honest judgment, keyed by merchant. That single table powers the memory chip, the warning notifications, and the honesty report. Everything else is plumbing.

**The server decides what the memory says**, not the client. When you build the mobile app later, iOS/Android get the same behavior for free.

**Notifications are a stub on purpose.** `notify.send()` is called at exactly the right moments; wiring it to Firebase Cloud Messaging (push) or Resend (email) is a swap of one function body.

## What's built so far

- **Accounts** — sign up and sign in with email + password (hashed with scrypt, sessions in httpOnly cookies). Every person's transactions, ratings, and settings are completely their own. In demo mode, each new account gets its own sample data to explore.
- **Real reminders** — browser push notifications that work locally with zero third-party accounts (VAPID keys generate themselves on first run). Turn them on in Settings, hit "Send a test," and you'll get a real system notification — even with the tab closed. Add a free Resend API key to .env and email reminders start working too. Every message is written in one voice: someone who's looking out for you, never scolding.
- **Spending** — recurring charges with per-month and per-year cost estimates (plus each merchant's rating history as dots), and a category breakdown where every category expands to show the purchases inside. Any purchase can be moved to another category — or a brand-new one the person invents ("Kids", "Vices", "Japan trip") — so the categories are shaped by each buyer, not by the bank.
- **Home** — transactions with the "Your past self" mirror, rating buttons (you rate right away, the moment a purchase appears), and the heads-up that fires when a merchant you've regretted charges you again.
- **Report** — the monthly honesty report: stacked bars per month, trend line, biggest regret and best call of each month.
- **Settings** — pick your own colors (with Classic, Colorblind-friendly, and High-contrast presets), rename all three rating labels ("Regret it" can become "Never again"), and choose a text size. Labels are always shown next to colors, so any palette stays readable.

## Roadmap (rough order)

1. **Dream purchases** — a pre-declared yellow tag ("Japan flight, planned splurge") so intentional big buys never get guilt-colored.
2. **LLM merchant cleanup** — "SQ *JOES COF 4471" → "Joe's Coffee", plus warm reminder copy.
3. **Mobile app** — React Native/Expo; the API doesn't change.

## Before you handle real money data

- Note for upgraders: if you ran an earlier version, delete `server/hindsight.db` once — the schema changed when accounts were added.
- Encrypt Plaid access tokens at rest (they're plaintext in SQLite right now — fine for sandbox, not for production).
- Use HTTPS everywhere, add rate limiting, and never log tokens.
- Read Plaid's security requirements — they audit production applicants.
- Consider hosting where compliance is easier (e.g., Supabase/AWS with encryption enabled) and write a privacy policy before onboarding anyone.
