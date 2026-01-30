const express = require('express');
const router = express.Router();
const Notification = require('../Models/Notification');
const { addNotification ,sendMultipleNotifications } = require('../Controllers/AddNotification');


router.post('/send-multiple', sendMultipleNotifications);
router.post('/:userId', addNotification);


router.get("/unread/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const count = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    return res.json({ count });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch unread count",
      error: err.message,
    });
  }
});


router.post("/read/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    );

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to mark notifications read",
      error: err.message,
    });
  }
});

module.exports = router;

module.exports = router;
