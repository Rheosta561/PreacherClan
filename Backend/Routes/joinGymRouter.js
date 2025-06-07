const express = require('express');
const router = express.Router();
const Gym = require('../Models/GymSchema');
const User = require('../Models/User');
const userJoinController = require('../Controllers/userJoinController');
const { check, validationResult } = require('express-validator');
// Join a gym
router.post('/:userId', userJoinController.joinController);

module.exports = router;