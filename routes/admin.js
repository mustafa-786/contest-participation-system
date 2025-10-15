// routes/admin.js
const express = require('express');
const pool = require('../db');
const { auth, permit } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/admin/finalize/:contestId
 * Finalize contest results after contest end:
 * - checks contest exists and endAt < now
 * - picks top N participants (isSubmitted = 1) ordered by score desc, submittedAt asc
 * - inserts into winners table and user_prizes table using a transaction
 * - marks contest as finalized by inserting a row in a contest_finalized table OR simply returns winners (we will not modify contests schema here)
 */
router.post('/finalize/:contestId', auth, permit('admin'), async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { contestId } = req.params;

    // 1) load contest
    const [[contest]] = await conn.query('SELECT * FROM contests WHERE id = ?', [contestId]);
    if (!contest) {
      conn.release();
      return res.status(404).json({ error: 'Contest not found' });
    }

    // make sure contest ended
    const now = new Date();
    if (new Date(contest.endAt) > now) {
      conn.release();
      return res.status(400).json({ error: 'Contest has not ended yet' });
    }

    // get prizeQuantity (default to 1)
    const prizeQuantity = contest.prizeQuantity || 1;
    if (prizeQuantity <= 0) {
      conn.release();
      return res.status(400).json({ error: 'Prize quantity must be >= 1' });
    }

    // 2) start transaction
    await conn.beginTransaction();

    // 3) fetch top submissions
    // Use FOR UPDATE to lock selected rows (not strictly necessary for SELECT) but we'll do simple selection
    const [topRows] = await conn.query(
      `SELECT s.id as submissionId, s.userId, s.score, s.submittedAt
       FROM submissions s
       WHERE s.contestId = ? AND s.isSubmitted = 1
       ORDER BY s.score DESC, s.submittedAt ASC
       LIMIT ?`,
      [contestId, prizeQuantity]
    );

    if (topRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(200).json({ message: 'No submitted participants to award' });
    }

    // 4) insert winners and user_prizes
    const winnersInserted = [];
    let rank = 1;
    for (const p of topRows) {
      // Avoid duplicate winners (unique index on contestId+userId)
      const [existing] = await conn.query('SELECT id FROM winners WHERE contestId=? AND userId=?', [contestId, p.userId]);
      if (existing.length > 0) {
        // skip if already awarded
        rank++;
        continue;
      }

      const [wRes] = await conn.query(
        'INSERT INTO winners (contestId, userId, rank, prizeTitle, prizeDescription) VALUES (?,?,?,?,?)',
        [contestId, p.userId, rank, contest.prizeTitle || null, contest.prizeDescription || null]
      );

      await conn.query(
        'INSERT INTO user_prizes (userId, contestId, title, description) VALUES (?,?,?,?)',
        [p.userId, contestId, contest.prizeTitle || null, contest.prizeDescription || null]
      );

      winnersInserted.push({ id: wRes.insertId, userId: p.userId, rank });
      rank++;
    }

    // 5) commit
    await conn.commit();
    conn.release();

    // 6) return winners
    return res.json({ data: winnersInserted });
  } catch (err) {
    try { await conn.rollback(); } catch (e) {}
    conn.release();
    next(err);
  }
});

module.exports = router;
