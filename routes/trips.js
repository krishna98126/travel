import express from "express";
import db from "../db.js";
import { requireAuth } from "../authMiddleware.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", (req, res) => {
  const trips = db.prepare(`
    SELECT id, title, destination, payload, created_at
    FROM saved_trips
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(req.user.id).map(t => ({
    ...t,
    payload: JSON.parse(t.payload)
  }));

  res.json({ trips });
});

router.post("/", (req, res) => {
  const { title, destination, payload } = req.body;

  if (!title || !destination || !payload) {
    return res.status(400).json({ error: "title, destination and payload are required." });
  }

  const result = db.prepare(`
    INSERT INTO saved_trips (user_id, title, destination, payload)
    VALUES (?, ?, ?, ?)
  `).run(req.user.id, title, destination, JSON.stringify(payload));

  res.status(201).json({ id: result.lastInsertRowid });
});

export default router;
