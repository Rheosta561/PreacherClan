const express = require('express');
const router = express.Router();
const {getProfiles} = require('../Controllers/getProfilesController');
const {getProfileById} = require('../Controllers/getProfilesController');

router.get('/', getProfiles);
router.get('/:userId', getProfileById);
module.exports = router;