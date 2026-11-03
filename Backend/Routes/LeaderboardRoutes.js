const express = require('express');
const router = express.Router();
const { getGlobalLeaderboard, getUserRank, getScoreHistory } = require('../Controllers/LeaderboardController');
const auth = require('../Middleware/auth');

// GET /leaderboard - Fetch paginated global leaderboard
router.get('/', getGlobalLeaderboard);
router.get('/history/:userId', auth, getScoreHistory);

// GET /leaderboard/rank/:userId - Fetch current user's score and global rank
router.get('/rank/:userId', getUserRank);

module.exports = router;
