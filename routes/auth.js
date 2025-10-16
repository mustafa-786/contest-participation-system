const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// Signup
router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const [existing] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (existing.length) return res.status(400).json({ error: 'Email already registered' });

    const [roleRow] = await pool.query('SELECT id FROM roles WHERE name=?', [role || 'user']);
    if (!roleRow.length) return res.status(400).json({ error: 'Invalid role' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query('INSERT INTO users (name,email,passwordHash,roleId) VALUES (?,?,?,?)', [name, email, hash, roleRow[0].id]);
    const token = jwt.sign({ id: result.insertId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.json({ token, user: { id: result.insertId, name, email, role } });
  } catch (err) { next(err); }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT u.id,u.name,u.email,u.passwordHash,r.name as role FROM users u JOIN roles r ON u.roleId=r.id WHERE u.email=?', [email]);
    if (!rows.length) return res.status(400).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { next(err); }
});

module.exports = router;
