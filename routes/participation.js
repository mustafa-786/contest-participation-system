const express = require("express");
const pool = require("../db");
const { auth, permit } = require("../middleware/auth");
const router = express.Router();

// Join contest (create submission)
router.post("/join/:contestId", auth, async (req, res, next) => {
  try {
    const contestId = req.params.contestId;
    const [contestRows] = await pool.query(
      "SELECT * FROM contests WHERE id=?",
      [contestId]
    );
    if (!contestRows.length)
      return res.status(404).json({ error: "Contest not found" });
    const contest = contestRows[0];
    console.log(contest.accessLevel);
    console.log(req.user.role, "req.user.role");
    if (
      contest.accessLevel === "vip" &&
      !["VIP", "Admin"].includes(req.user.role)
    )
      return res.status(403).json({ error: "VIP access required" });

    const now = new Date();
    if (now < contest.start_at || now > contest.end_at)
      return res.status(400).json({ error: "Contest not active" });

    const [existing] = await pool.query(
      "SELECT * FROM submissions WHERE userId=? AND contestId=?",
      [req.user.id, contestId]
    );
    if (existing.length) return res.json({ data: existing[0] });

    const [result] = await pool.query(
      "INSERT INTO submissions (userId,contestId) VALUES (?,?)",
      [req.user.id, contestId]
    );
    res.json({ data: { submissionId: result.insertId } });
  } catch (err) {
    next(err);
  }
});

// Submit answers
router.post("/submit/:contestId", auth, async (req, res, next) => {
  try {
    const contestId = req.params.contestId;
    const { answers } = req.body;
    if (!Array.isArray(answers) || answers.length === 0)
      return res.status(400).json({ error: "Answers array required" });
    const [[contest]] = await pool.query(
      "SELECT * FROM contests WHERE id = ?",
      [contestId]
    );
    console.log(req.user.role )
    if (!contest) return res.status(404).json({ error: "Contest not found" });
    const now = new Date();
    if (now < new Date(contest.startAt))
      return res.status(400).json({ error: "Contest has not started yet" });
    if (now > new Date(contest.endAt))
      return res.status(400).json({ error: "Contest has ended" });
    if (
      contest.accessLevel === "vip" &&
      !["VIP", "Admin"].includes(req.user.role)
    )
      return res.status(403).json({ error: "Requires VIP access" });
    const [existing] = await pool.query(
      "SELECT * FROM submissions WHERE userId = ? AND contestId = ?",
      [req.user.id, contestId]
    );
    let submissionId;
    if (existing.length === 0) {
      const [ins] = await pool.query(
        "INSERT INTO submissions (userId,contestId,startedAt) VALUES (?,?,?)",
        [req.user.id, contestId, now]
      );
      submissionId = ins.insertId;
    } else {
      
      if (existing[0].isSubmitted)
        return res.status(400).json({ error: "Already submitted" });
      submissionId = existing[0].id;
    }
    // Load questions
    const [questionRows] = await pool.query(
      "SELECT * FROM questions WHERE contestId = ?",
      [contestId]
    );
    
    const qMap = new Map();
    questionRows.forEach((q) => qMap.set(String(q.id), q));
    // Scoring
    let totalScore = 0;
    for (const a of answers) {
      const q = qMap.get(String(a.questionId));
      if (!q || !Array.isArray(a.selectedOptions)) continue;
      const correct = new Set(JSON.parse(q.correctOptions || "[]").map(String));
      const given = new Set(a.selectedOptions.map(String));
      let isCorrect = false;
      console.log({ questionId: a.questionId, correct: [...correct], given: [...given], isCorrect });

      if (q.type === "single" || q.type === "tf") {
        if (given.size === 1 && correct.has([...given][0])) isCorrect = true;
      } else if (q.type === "multi") {
        if (
          given.size === correct.size &&
          [...given].every((x) => correct.has(x))
        )
          isCorrect = true;
      }
      if (isCorrect) totalScore += q.points || 1;
    }
    // Update submission
    await pool.query(
      "UPDATE submissions SET answers = ?, score = ?, isSubmitted = ?, submittedAt = ? WHERE id = ?",
      [JSON.stringify(answers), totalScore, true, now, submissionId]
    );
    res.json({ data: { score: totalScore } });
  } catch (err) {
    next(err);
  }
});




module.exports = router;
