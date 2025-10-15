const express = require('express');
 const pool = require('../db');
 const { auth } = require('../middleware/auth');
 const router = express.Router();
 // user history
 router.get('/history', auth, async (req, res, next) => {
try {
 const [rows] = await pool.query('SELECT s.*, c.name as contestName FROM submissions s JOIN contests c ON s.contestId = c.id WHERE s.userId = ? ORDER BY s.createdAt DESC', [req.user.id]);
 res.json({ data: rows });
 } catch (err) { next(err); }
 });
 // list prizes won (this implementation: prizes can be stored in a table; for simplicity we compute winners on the fly is not implemented here)
 router.get('/prizes', auth, async (req, res, next) => {
 try {
 // Placeholder: in production, maintain a winners table. Returning empty list for now.
 res.json({ data: [] });
 } catch (err) { next(err); }
 });
 module.exports = router