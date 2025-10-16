const express = require('express');
 const pool = require('../db');
 const { auth } = require('../middleware/auth');
 const router = express.Router();
//  // user history
router.get("/:userId/history", auth, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);   
    if (req.user.id !== userId && req.user.role !== "Admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    // In-progress contests
    const [inProgress] = await pool.query(
      `SELECT c.id AS contestId, c.name, c.startAt, c.endAt, s.startedAt AS joinedAt
       FROM submissions s
       JOIN contests c ON s.contestId = c.id
       WHERE s.userId = ? AND s.isSubmitted = 0`,
      [userId]
    );

    // Completed contests
    const [completed] = await pool.query(
      `SELECT c.id AS contestId, c.name, s.score, s.submittedAt
       FROM submissions s
       JOIN contests c ON s.contestId = c.id
       WHERE s.userId = ? AND s.isSubmitted = 1`,
      [userId]
    );

    // Prizes won
    const [prizesWon] = await pool.query(
      `SELECT w.contestId AS contestId, c.name AS contestName, w.prizeTitle AS prizeTitle, 
              w.prizeDescription AS prizeDescription, w.score, w.rank, w.createdAt AS wonAt
       FROM winners w
       JOIN contests c ON w.contestId = c.id
       WHERE w.userId = ?`,
      [userId]
    );

    res.json({ inProgress, completed, prizesWon });
  } catch (err) {
    next(err);
  }
});
 module.exports = router