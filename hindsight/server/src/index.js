import "dotenv/config";
import express from "express";
import cors from "cors";
import plaidRoutes from "./routes/plaid.js";
import txRoutes from "./routes/transactions.js";
import settingsRoutes from "./routes/settings.js";
import authRoutes from "./routes/auth.js";
import notificationRoutes from "./routes/notifications.js";
import { DEMO_MODE } from "./plaid.js";

const app = express();
app.use(cors());
app.use(express.json());


app.get("/api/health", (req, res) => res.json({ ok: true, demo: DEMO_MODE }));
app.use("/api/auth", authRoutes);
app.use("/api/plaid", plaidRoutes);
app.use("/api/transactions", txRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/notifications", notificationRoutes);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Hindsight API on http://localhost:${port} ${DEMO_MODE ? "(demo mode)" : "(Plaid " + (process.env.PLAID_ENV || "sandbox") + ")"}`);
});
