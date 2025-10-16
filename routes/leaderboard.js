const express = require("express");
const pool = require("../db");
const router = express.Router();
router.get("/:contestId", async (req, res, next) => {
  try {
    const contestId = req.params.contestId;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const [rows] = await pool.query(
      `SELECT s.userId, s.score, s.submittedAt, u.name, u.email FROM submissions s 
JOIN users u ON s.userId = u.id WHERE s.contestId = ? AND s.isSubmitted = 1 
ORDER BY s.score DESC, s.submittedAt ASC LIMIT ?`,
      [contestId, limit]
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
