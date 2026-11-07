const express = require('express');
const router = express.Router();
const { getProfiles, getProfileById, getTopPreachersOfTown } = require('../Controllers/getProfilesController');
const { handleRemoveFriend } = require('../Controllers/RepmateController');
const auth = require('../Middleware/auth');

router.get('/', getProfiles);
router.get('/top-preachers', auth, getTopPreachersOfTown);
router.get('/top-preachers/:userId', auth, (req, res, next) => {
  if (String(req.user.id) !== String(req.params.userId)) return res.status(403).json({ message: 'Forbidden' });
  return getTopPreachersOfTown(req, res, next);
});
router.get('/:userId', getProfileById);
router.delete('/remove', handleRemoveFriend);

module.exports = router;
