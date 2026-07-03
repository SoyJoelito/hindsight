import webpush from "web-push";
import db from "./db.js";

/*
 * Real notifications, two channels:
 *
 * PUSH — browser push via the Web Push standard. Works locally with zero
 *   third-party accounts: VAPID keys are generated automatically on first
 *   run and stored in app_config. The user flips it on in Settings.
 *
 * EMAIL — via Resend (https://resend.com, generous free tier). Set
 *   RESEND_API_KEY in .env and emails just start working; without a key
 *   we log to the console so nothing breaks.
 *
 * VOICE — every message sounds like someone who's looking out for you:
 *   warm, on your side, never scolding. The templates live here so the
 *   whole app speaks with one voice.
 */

function vapidKeys() {
  let row = db.prepare(`SELECT value FROM app_config WHERE key = 'vapid'`).get();
  if (!row) {
    const keys = webpush.generateVAPIDKeys();
    db.prepare(`INSERT INTO app_config (key, value) VALUES ('vapid', ?)`).run(
      JSON.stringify(keys)
    );
    row = { value: JSON.stringify(keys) };
  }
  return JSON.parse(row.value);
}

const keys = vapidKeys();
webpush.setVapidDetails("mailto:hello@hindsight.app", keys.publicKey, keys.privateKey);

export const vapidPublicKey = keys.publicKey;

export function saveSubscription(userId, subscription) {
  db.prepare(
    `INSERT OR IGNORE INTO push_subscriptions (user_id, subscription) VALUES (?, ?)`
  ).run(userId, JSON.stringify(subscription));
}

/* ————— the voice ————— */
export const messages = {
  redRecurring: (merchant, label) =>
    `Got it — ${merchant} goes down as "${label}". Next time they charge you, I'll give you a heads-up before the money leaves. I've got your back.`,
  headsUp: (merchant, amount, redCount, total) =>
    `Heads-up: ${merchant} just charged ${amount}. The last ${total} times, you weren't happy about ${redCount} of them. No judgment — just looking out for you.`,
  test: () =>
    `Reminders are on. When a purchase you've regretted before shows up again, you'll hear from me first. That's the whole job.`,
};

/* ————— delivery ————— */
export async function send(userId, { title, body }) {
  const results = { push: 0, email: false, console: false };

  // push: every device this person enabled
  const subs = db
    .prepare(`SELECT id, subscription FROM push_subscriptions WHERE user_id = ?`)
    .all(userId);
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        JSON.parse(s.subscription),
        JSON.stringify({ title, body })
      );
      results.push++;
    } catch (e) {
      // 404/410 = the browser revoked this subscription; clean it up quietly
      if (e.statusCode === 404 || e.statusCode === 410)
        db.prepare(`DELETE FROM push_subscriptions WHERE id = ?`).run(s.id);
    }
  }

  // email: only when a Resend key is configured
  if (process.env.RESEND_API_KEY) {
    const user = db.prepare(`SELECT email FROM users WHERE id = ?`).get(userId);
    if (user) {
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "Hindsight <onboarding@resend.dev>",
            to: [user.email],
            subject: title,
            text: body,
          }),
        });
        results.email = r.ok;
      } catch {
        /* email is best-effort; push and console still deliver */
      }
    }
  }

  if (results.push === 0 && !results.email) {
    console.log(`🔔 [notification for user ${userId}] ${title}: ${body}`);
    results.console = true;
  }
  return results;
}
