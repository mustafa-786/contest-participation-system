//  const express = require('express');
//  const pool = require('../db');
//  const { auth } = require('../middleware/auth');
//  const router = express.Router();
//  // Join a contest (create submission record if not exists)
//  router.post('/join/:contestId', auth, async (req, res, next) => {
//  try {
//  const contestId = req.params.contestId;
//  const [[contest]] = await pool.query('SELECT * FROM contests WHERE id = ?',
//  [contestId]);
//  if (!contest) return res.status(404).json({ error: 'Contest not found' });
//  if (contest.accessLevel === 'vip' && !
//  ['vip','admin'].includes(req.user.role)) return res.status(403).json({ error:
//  'Requires VIP access' });
//  9
// const now = new Date();
//  if (now < new Date(contest.startAt)) return res.status(400).json({ error:
//  'Contest has not started yet' });
//  if (now > new Date(contest.endAt)) return res.status(400).json({ error:
//  'Contest has ended' });
//  const [existing] = await pool.query('SELECT * FROM submissions WHERE userId = ? AND contestId = ?', [req.user.id, contestId]);
//  if (existing.length > 0) return res.json({ data: existing[0] });
//  const [result] = await pool.query('INSERT INTO submissions (userId,contestId,startedAt) VALUES (?,?,?)', [req.user.id, contestId, now]);
//  const [rows] = await pool.query('SELECT * FROM submissions WHERE id = ?',
//  [result.insertId]);
//  res.json({ data: rows[0] });
//  } catch (err) { next(err); }
//  });

//  // Submit answers
//  router.post('/submit/:contestId', auth, async (req, res, next) => {
//  try {
//  const contestId = req.params.contestId;
//  const { answers } = req.body; 
//  if (!Array.isArray(answers) || answers.length === 0) return res.status(400).json({ error: 'Answers array required' });
//  const [[contest]] = await pool.query('SELECT * FROM contests WHERE id = ?',
//  [contestId]);
//  if (!contest) return res.status(404).json({ error: 'Contest not found' });
//  const now = new Date();
//  if (now < new Date(contest.startAt)) return res.status(400).json({ error:
//  'Contest has not started yet' });
//  if (now > new Date(contest.endAt)) return res.status(400).json({ error:
//  'Contest has ended' });
//  if (contest.accessLevel === 'vip' && !
//  ['vip','admin'].includes(req.user.role)) return res.status(403).json({ error:
//  'Requires VIP access' });
//  const [existing] = await pool.query('SELECT * FROM submissions WHERE userId = ? AND contestId = ?', [req.user.id, contestId]);
//  let submissionId;
//  if (existing.length === 0) {
//  const [ins] = await pool.query('INSERT INTO submissions (userId,contestId,startedAt) VALUES (?,?,?)', [req.user.id, contestId, now]);
//  submissionId = ins.insertId;
//  10
// } else {
//  if (existing[0].isSubmitted) return res.status(400).json({ error:
//  'Already submitted' });
//  submissionId = existing[0].id;
//  }
//  // Load questions
//  const [questionRows] = await pool.query('SELECT * FROM questions WHERE contestId = ?', [contestId]);
//  const qMap = new Map();
//  questionRows.forEach(q => qMap.set(String(q.id), q));
//  // Scoring
//  let totalScore = 0;
//  for (const a of answers) {
//  const q = qMap.get(String(a.questionId));
//  if (!q || !Array.isArray(a.selectedOptions)) continue;
//  const correct = new Set(JSON.parse(q.correctOptions || '[]').map(String));
//  const given = new Set(a.selectedOptions.map(String));
//  let isCorrect = false;
//  if (q.type === 'single' || q.type === 'tf') {
//  if (given.size === 1 && correct.has([...given][0])) isCorrect = true;
//  } else if (q.type === 'multi') {
//  if (given.size === correct.size && [...given].every(x =>
//  correct.has(x))) isCorrect = true;
//  }
//  if (isCorrect) totalScore += (q.points || 1);
//  }
//  // Update submission
//  await
//  pool.query('UPDATE submissions SET answers = ?, score = ?, isSubmitted = ?, submittedAt = ? WHERE id = ?', [JSON.stringify(answers), totalScore, true, now,
//  submissionId]);
//  res.json({ data: { score: totalScore } });
//  } catch (err) { next(err); }
//  });
//  // Get in-progress submissions for user
//  router.get('/me/in-progress', auth, async (req, res, next) => {
//  try {
//  const [rows] = await pool.query('SELECT s.*, c.name as contestName, c.startAt, c.endAt FROM submissions s JOIN contests c ON s.contestId = c.id WHERE s.userId = ? AND s.isSubmitted = 0', [req.user.id]);
//  res.json({ data: rows });
//  } catch (err) { next(err); }
//  })

//  module.exports = router


const express = require('express');
const pool = require('../db');
const { auth, permit } = require('../middleware/auth');
const router = express.Router();

// Join contest (create submission)
router.post('/join/:contestId', auth, async (req, res, next) => {
  try {
    const contestId = req.params.contestId;
    const [contestRows] = await pool.query('SELECT * FROM contests WHERE id=?', [contestId]);
    if (!contestRows.length) return res.status(404).json({ error: 'Contest not found' });
    const contest = contestRows[0];

    if (contest.access_level === 'vip' && !['vip','admin'].includes(req.user.role)) return res.status(403).json({ error: 'VIP access required' });

    const now = new Date();
    if (now < contest.start_at || now > contest.end_at) return res.status(400).json({ error: 'Contest not active' });

    const [existing] = await pool.query('SELECT * FROM submissions WHERE user_id=? AND contest_id=?', [req.user.id, contestId]);
    if (existing.length) return res.json({ data: existing[0] });

    const [result] = await pool.query('INSERT INTO submissions (user_id,contest_id) VALUES (?,?)', [req.user.id, contestId]);
    res.json({ data: { submissionId: result.insertId } });
  } catch (err) { next(err); }
});

// Submit answers
router.post('/submit/:contestId', auth, async (req, res, next) => {
  try {
    const contestId = req.params.contestId;
    const { answers } = req.body; // [{questionId, selectedOptions: []}]
    const [contestRows] = await pool.query('SELECT * FROM contests WHERE id=?', [contestId]);
    if (!contestRows.length) return res.status(404).json({ error: 'Contest not found' });
    const contest = contestRows[0];

    const [submissionRows] = await pool.query('SELECT * FROM submissions WHERE user_id=? AND contest_id=?', [req.user.id, contestId]);
    if (!submissionRows.length) return res.status(400).json({ error: 'You must join contest first' });
    const submission = submissionRows[0];

    if (submission.is_submitted) return res.status(400).json({ error: 'Already submitted' });

    // Calculate score
    let totalScore = 0;
    for (const a of answers) {
      const [optionRows] = await pool.query('SELECT * FROM options WHERE question_id=?', [a.questionId]);
      const correctSet = new Set(optionRows.filter(r=>r.is_correct).map(r=>r.option_id));
      const givenSet = new Set(a.selectedOptions);

      const questionType = optionRows[0] ? optionRows[0].type : 'single'; // optional
      let isCorrect = false;
      if (questionType === 'single' || questionType === 'tf') {
        if (givenSet.size === 1 && correctSet.has([...givenSet][0])) isCorrect = true;
      } else if (questionType === 'multi') {
        if (givenSet.size === correctSet.size && [...givenSet].every(x => correctSet.has(x))) isCorrect = true;
      }
      if (isCorrect) totalScore += 1; // assuming 1 point per question
    }

    // Save answers
    for (const a of answers) {
      for (const optId of a.selectedOptions) {
        await pool.query('INSERT INTO submission_answers (submission_id,question_id,option_id) VALUES (?,?,?)', [submission.id, a.questionId, optId]);
      }
    }

    // Update submission score
    await pool.query('UPDATE submissions SET score=?,is_submitted=1,submitted_at=NOW() WHERE id=?', [totalScore, submission.id]);

    res.json({ data: { score: totalScore } });
  } catch (err) { next(err); }
});

module.exports = router;
