import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import "./db.js";
import authRoutes from "./routes/auth.js";
import travelRoutes from "./routes/travel.js";
import aiRoutes from "./routes/ai.js";
import tripRoutes from "./routes/trips.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "Travel backend",
    time: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/travel", travelRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/trips", tripRoutes);

// Serve the existing frontend from /public
app.use(express.static(path.join(__dirname, "public")));

app.get(/^\/(?!api(?:\/|$)).*/, (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API route not found." });
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Travel app running at http://localhost:${PORT}`);
});
