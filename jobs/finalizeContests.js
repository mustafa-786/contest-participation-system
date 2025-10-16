const pool = require("../db");

async function finalizeExpiredContests() {
  try {
    const [contests] = await pool.query(
      "SELECT id, prizeTitle, prizeDescription FROM contests WHERE endAt < NOW() AND isFinalized = 0"
    );

    if (!Array.isArray(contests) || contests.length === 0) {
      return;
    }

    for (const contest of contests) {
      // Get all participants ranked by score (highest first)
      const [results] = await pool.query(
        `SELECT userId, score
         FROM submissions
         WHERE contestId = ?
         ORDER BY score DESC`,
        [contest.id]
      );

      if (!Array.isArray(results) || results.length === 0) {
        continue;
      }

      let rank = 1;
      for (const result of results) {
        await pool.query(
          `INSERT INTO winners 
          (contestId, userId, score, rank, prizeTitle, prizeDescription)
          VALUES (?, ?, ?, ?, ?, ?)`,
          [
            contest.id,
            result.userId,
            result.score,
            rank,
            rank === 1 ? contest.prizeTitle : null,
            rank === 1 ? contest.prizeDescription : null,
          ]
        );
        rank++;
      }

      await pool.query("UPDATE contests SET isFinalized = 1 WHERE id = ?", [
        contest.id,
      ]);
    }
  } catch (error) {
    console.error("Error while finalizing contests:", error);
  }
}



module.exports = finalizeExpiredContests;
