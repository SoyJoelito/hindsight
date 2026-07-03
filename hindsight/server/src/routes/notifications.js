import { Router } from "express";
import { requireAuth } from "../auth.js";
import { vapidPublicKey, saveSubscription, send, messages } from "../notify.js";

const router = Router();
router.use(requireAuth);

/* The browser needs the public key to create a push subscription. */
router.get("/vapid-public-key", (req, res) => res.json({ key: vapidPublicKey }));

/* Save this device's subscription so we can reach it later. */
router.post("/subscribe", (req, res) => {
  const sub = req.body;
  if (!sub?.endpoint) return res.status(400).json({ error: "Missing subscription." });
  saveSubscription(req.userId, sub);
  res.json({ ok: true });
});

/* "Send me a test reminder" button in Settings. */
router.post("/test", async (req, res) => {
  const result = await send(req.userId, { title: "Hindsight", body: messages.test() });
  res.json(result);
});

export default router;
