import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, firstName: user.first_name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phone: user.phone,
    nationality: user.nationality
  };
}

router.post("/signup", async (req, res) => {
  try {
    const {
      firstName, lastName = "", email, phone = "",
      dateOfBirth = "", nationality = "", idType = "",
      idNumber = "", password
    } = req.body;

    if (!firstName || !email || !password) {
      return res.status(400).json({ error: "First name, email and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must contain at least 6 characters." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);

    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const hash = await bcrypt.hash(password, 12);

    const result = db.prepare(`
      INSERT INTO users
      (first_name,last_name,email,phone,date_of_birth,nationality,id_type,id_number,password_hash)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).run(
      firstName.trim(),
      lastName.trim(),
      normalizedEmail,
      phone.trim(),
      dateOfBirth,
      nationality,
      idType,
      idNumber,
      hash
    );

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    const token = signToken(user);

    res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not create account." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = db.prepare("SELECT * FROM users WHERE email = ?")
      .get((email || "").trim().toLowerCase());

    if (!user || !(await bcrypt.compare(password || "", user.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not log in." });
  }
});

export default router;
