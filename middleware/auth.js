// const jwt = require('jsonwebtoken');
// const pool = require('../db');
// const auth = async (req, res, next) => {
// const authHeader = req.headers.authorization;
// if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
// const token = authHeader.split(' ')[1];
// try {
// const payload = jwt.verify(token, process.env.JWT_SECRET);
// const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [payload.id]);
// if (!rows || rows.length === 0) return res.status(401).json({ error: 'Unauthorized' });
// req.user = rows[0];
// next();
// } catch (err) {
// return res.status(401).json({ error: 'Invalid token' });
// }
// };


// const permit = (...allowedRoles) => (req, res, next) => {
// if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
// if (allowedRoles.includes(req.user.role)) return next();
// return res.status(403).json({ error: 'Forbidden' });
// };


// module.exports = { auth, permit };

const jwt = require('jsonwebtoken');
const pool = require('../db');

const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query('SELECT u.id, u.name, u.email, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?', [payload.id]);
    if (!rows[0]) return res.status(401).json({ error: 'Unauthorized' });
    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const permit = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (allowedRoles.includes(req.user.role)) return next();
  return res.status(403).json({ error: 'Forbidden' });
};

module.exports = { auth, permit };
