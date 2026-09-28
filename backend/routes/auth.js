// routes/auth.js
// Handles account creation and login.
//
// Passwords are never stored in plain text - bcrypt hashes them before
// they touch the database. Login issues a JWT (a signed token) that the
// frontend stores and sends back on every request that needs to know
// who's logged in.

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '7d';

// Limits repeated attempts against login/signup from the same IP - without
// this, nothing stops a script from trying thousands of passwords per
// minute against a single account. 20 attempts per 15 minutes is generous
// for a real user who mistypes their password, but blocks brute-forcing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' }
});

// POST /api/auth/signup
router.post('/signup', authLimiter, async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are all required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?')
    .get(username, email);
  if (existing) {
    return res.status(409).json({ error: 'That username or email is already taken.' });
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = db.prepare(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
  ).run(username, email, password_hash);

  const token = jwt.sign(
    { id: result.lastInsertRowid, username },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );

  res.status(201).json({ token, user: { id: result.lastInsertRowid, username, email } });
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?')
    .get(username, username);

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );

  res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
});

module.exports = router;
