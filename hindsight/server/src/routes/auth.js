import { Router } from "express";
import db from "../db.js";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
} from "../auth.js";
import { DEMO_MODE } from "../plaid.js";
import { seedDemo } from "../demo.js";

const router = Router();

router.post("/signup", (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !/^\S+@\S+\.\S+$/.test(email))
    return res.status(400).json({ error: "That email doesn't look right — mind checking it?" });
  if (!password || password.length < 8)
    return res.status(400).json({ error: "Pick a password with at least 8 characters." });

  const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email.toLowerCase());
  if (existing)
    return res.status(409).json({ error: "You already have an account — sign in instead." });

  const info = db
    .prepare(`INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)`)
    .run(email.toLowerCase(), hashPassword(password), (name || "").trim().slice(0, 60) || null);

  const userId = Number(info.lastInsertRowid);
  if (DEMO_MODE) seedDemo(userId); // every new person gets sample data to explore

  setSessionCookie(res, createSession(userId));
  res.json({ id: userId, email: email.toLowerCase(), name: name || null });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  const user = email
    ? db.prepare(`SELECT * FROM users WHERE email = ?`).get(email.toLowerCase())
    : null;
  if (!user || !verifyPassword(password || "", user.password_hash))
    return res.status(401).json({ error: "Email or password didn't match. Try again?" });

  setSessionCookie(res, createSession(user.id));
  res.json({ id: user.id, email: user.email, name: user.name });
});

router.post("/logout", requireAuth, (req, res) => {
  destroySession(req.sessionToken);
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare(`SELECT id, email, name FROM users WHERE id = ?`).get(req.userId);
  res.json(user);
});

export default router;
