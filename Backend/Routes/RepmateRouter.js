const express = require('express');
const router = express.Router();
const {getProfiles} = require('../Controllers/getProfilesController');
const {getProfileById , getTopPreachersOfTown} = require('../Controllers/getProfilesController');
const {handleRemoveFriend} = require('../Controllers/RepmateController');

router.get('/', getProfiles);
router.get('/:userId', getProfileById);
router.get(
  "/top-preachers/:userId",
  getTopPreachersOfTown
);

router.delete('/remove' , handleRemoveFriend);
module.exports = router;