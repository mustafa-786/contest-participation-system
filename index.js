require('dotenv').config();
const finalizeExpiredContests  =require("./jobs/finalizeContests");
const cron = require("node-cron");
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const rateLimit = require('express-rate-limit');


const authRoutes = require('./routes/auth');
const contestRoutes = require('./routes/contests');
const participationRoutes = require('./routes/participation');
const leaderboardRoutes = require('./routes/leaderboard');
const userRoutes = require('./routes/user');
const { errorHandler } = require('./middleware/errorHandler');


const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));


const apiLimiter = rateLimit({
windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15') * 60 * 1000),
max: parseInt(process.env.RATE_LIMIT_MAX || '200'),
standardHeaders: true,
legacyHeaders: false
});
app.use('/api/', apiLimiter);


app.use('/api/auth', authRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/participation', participationRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/users', userRoutes);

app.get('/hello', (_req, res) => res.json({ ok: true }));


app.use(errorHandler);
cron.schedule("*/1 * * * *", finalizeExpiredContests); // every 10 minutes


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));