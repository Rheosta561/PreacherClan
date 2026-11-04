const express = require('express');
const router = express.Router();
const { addNotification ,sendMultipleNotifications } = require('../Controllers/AddNotification');
const { getNotifications, getUnreadCount, markAllRead, savePushToken } = require('../Controllers/NotificationController');
const auth = require('../Middleware/auth');
const User = require('../Models/User');

const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('isAdmin');
    if (!user?.isAdmin) return res.status(403).json({ message: 'Admin access required' });
    return next();
  } catch (error) {
    return res.status(500).json({ message: 'Could not verify notification permissions' });
  }
};


router.post('/send-multiple', auth, requireAdmin, sendMultipleNotifications);
router.post('/push-token', auth, savePushToken);
router.get('/:userId', auth, getNotifications);
router.get('/unread/:userId', auth, getUnreadCount);
router.post('/read/:userId', auth, markAllRead);
router.post('/:userId', auth, addNotification);
module.exports = router;
