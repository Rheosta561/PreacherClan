const express = require('express');
const router = express.Router();
const Notification = require('../Models/Notification');
const { addNotification ,sendMultipleNotifications } = require('../Controllers/AddNotification');


router.post('/send-multiple', sendMultipleNotifications);
router.post('/:userId', addNotification);
module.exports = router;