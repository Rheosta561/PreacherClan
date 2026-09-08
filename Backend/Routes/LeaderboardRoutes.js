const express = require('express');
const router = express.Router();
const { getGlobalLeaderboard, getUserRank } = require('../Controllers/LeaderboardController');

// GET /leaderboard - Fetch paginated global leaderboard
router.get('/', getGlobalLeaderboard);

// GET /leaderboard/rank/:userId - Fetch current user's score and global rank
router.get('/rank/:userId', getUserRank);

module.exports = router;
