const express = require("express");
const pool = require("../db");
const { auth, permit } = require("../middleware/auth");
const router = express.Router();
// List contests (public)
router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const accessLevel = req.query.accessLevel;
    let sql =
      "SELECT id, name, description, accessLevel, startAt, endAt,prizeTitle, prizeDescription, prizeQuantity, createdBy, createdAt FROM contests";
    const params = [];
    if (accessLevel && ["vip", "normal"].includes(accessLevel)) {
      sql += " WHERE accessLevel = ?";
      params.push(accessLevel);
    }
    sql += " ORDER BY startAt DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);
    const [rows] = await pool.query(sql, params);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// Create contest (admin/vip)
router.post("/", auth, permit("Admin", "VIP"), async (req, res, next) => {
  try {
    const {
      name,
      description,
      accessLevel,
      startAt,
      endAt,
      prizeTitle,
      prizeDescription,
      prizeQuantity,
      questions,
    } = req.body;
    if (
      !name ||
      !accessLevel ||
      !startAt ||
      !endAt ||
      !Array.isArray(questions) ||
      questions.length === 0
    )
      return res.status(400).json({ error: "Missing required fields" });
    if (!["vip", "normal"].includes(accessLevel))
      return res.status(400).json({
        error: "Invalid accessLevel",
      });
    if (new Date(startAt) >= new Date(endAt))
      return res.status(400).json({
        error: "startAt must be before endAt",
      });
    const [result] = await pool.query(
      "INSERT INTO contests (name,description,accessLevel,startAt,endAt,prizeTitle,prizeDescription,prizeQuantity,createdBy) VALUES (?,?,?,?,?,?,?,?,?)",
      [
        name,
        description || null,
        accessLevel,
        startAt,
        endAt,
        prizeTitle || null,
        prizeDescription || null,
        prizeQuantity || 1,
        req.user.id,
      ]
    );
    const contestId = result.insertId;
    // Insert questions
    const qInsertPromises = questions.map((q) => {
      const optionsJson = JSON.stringify(q.options || []);
      const correctJson = JSON.stringify(q.correctOptions || []);
      const points = q.points || 1;
      return pool.query(
        "INSERT INTO questions (contestId,text,type,options,correctOptions,points) VALUES (?,?,?,?,?,?)",
        [contestId, q.text, q.type, optionsJson, correctJson, points]
      );
    });
    await Promise.all(qInsertPromises);
    res.json({ data: { id: contestId } });
  } catch (err) {
    next(err);
  }
});

// Get single contest (without correct answers)
router.get("/:id", async (req, res, next) => {
  try {
    const contestId = req.params.id;
    const [[contestRows]] = await pool.query(
      "SELECT id, name, description, accessLevel, startAt, endAt, prizeTitle, prizeDescription, prizeQuantity, createdBy, createdAt FROM contests WHERE id = ?",
      [contestId]
    );
    if (!contestRows)
      return res.status(404).json({ error: "Contest not found" });
    const [questionsRows] = await pool.query(
      "SELECT id, text, type, options, points FROM questions WHERE contestId = ?",
      [contestId]
    );
    const questions = questionsRows.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      options: JSON.parse(q.options || "[]"),
      points: q.points,
    }));
    res.json({ data: { ...contestRows, questions } });
  } catch (err) {
    next(err);
  }
});
module.exports = router;