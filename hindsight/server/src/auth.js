import crypto from "node:crypto";
import db from "./db.js";

/*
 * Password hashing with scrypt (built into Node — no dependencies, and
 * deliberately slow to compute, which is what you want for passwords).
 * Stored as "salt:hash" hex. Sessions are random tokens in the database,
 * delivered as an httpOnly cookie so client JavaScript can never read them.
 */

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
}

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  db.prepare(`INSERT INTO sessions (token, user_id) VALUES (?, ?)`).run(token, userId);
  return token;
}

export function destroySession(token) {
  if (token) db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}

export function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export const COOKIE = "hs_session";

export function setSessionCookie(res, token) {
  // Add "; Secure" once you're serving over HTTPS in production.
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
  );
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

/* Middleware: every protected route gets req.userId or a friendly 401. */
export function requireAuth(req, res, next) {
  const token = parseCookies(req)[COOKIE];
  const row = token
    ? db.prepare(`SELECT user_id FROM sessions WHERE token = ?`).get(token)
    : null;
  if (!row) return res.status(401).json({ error: "Please sign in first." });
  req.userId = row.user_id;
  req.sessionToken = token;
  next();
}
