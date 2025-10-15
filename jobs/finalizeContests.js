const cron = require("node-cron");
const pool = require("../db");

async function finalizeExpiredContests() {
  console.log("⏰ Checking for contests to finalize...");

  try {
    const [contests] = await pool.query(
      "SELECT id, prizeTitle, prizeDescription FROM contests WHERE endAt < NOW() AND isFinalized = 0"
    );

    if (!Array.isArray(contests) || contests.length === 0) {
      console.log("No contests to finalize right now.");
      return;
    }

    for (const contest of contests) {
      // Get all participants ranked by score (highest first)
      const [results] = await pool.query(
        `SELECT user_id, score
         FROM submissions
         WHERE contest_id = ?
         ORDER BY score DESC`,
        [contest.id]
      );

      if (!Array.isArray(results) || results.length === 0) {
        console.log(`No submissions found for contest ID ${contest.id}`);
        continue;
      }

      let rank = 1;
      for (const result of results) {
        await pool.query(
          `INSERT INTO winners 
          (contest_id, user_id, score, rank, prize_title, prize_description)
          VALUES (?, ?, ?, ?, ?, ?)`,
          [
            contest.id,
            result.user_id,
            result.score,
            rank,
            rank === 1 ? contest.prize_title : null, // only first gets prize
            rank === 1 ? contest.prize_description : null,
          ]
        );
        rank++;
      }

      await pool.query("UPDATE contests SET is_finalized = 1 WHERE id = ?", [
        contest.id,
      ]);

      console.log(`🏁 Finalized contest ID: ${contest.id} with ${results.length} ranked participants`);
    }
  } catch (error) {
    console.error("Error while finalizing contests:", error);
  }
}



module.exports = finalizeExpiredContests;
