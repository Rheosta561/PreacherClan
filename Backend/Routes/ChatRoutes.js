const express = require('express');
const router = express.Router();
const auth = require('../Middleware/auth');
const { getUserChats, createUserChat, searchUserChats, deleteChatForMe } = require('../Controllers/chatController');

router.post('/getChats', auth, getUserChats);
router.post('/search', auth, searchUserChats);
router.delete('/delete/:chatId', auth, deleteChatForMe);
router.post('/:userId/:receiverId', auth, (req, res, next) => {
  if (String(req.user.id) !== String(req.params.userId)) return res.status(403).json({ error: 'Forbidden' });
  return next();
}, createUserChat);

module.exports = router;
