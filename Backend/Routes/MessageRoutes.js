const express = require('express');
const router = express.Router();
const auth = require('../Middleware/auth');
const { sendMessage, getMessages, deleteMessage } = require('../Controllers/messageController');
const { chatMediaUpload } = require('../Utils/chatUpload');

router.post('/send', auth, chatMediaUpload.array('media'), sendMessage);
router.delete('/delete/:messageId', auth, deleteMessage);
router.get('/fetch/:chatId', auth, getMessages);

module.exports = router;
