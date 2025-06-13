const express = require('express');
const router = express.Router();
const {getMessages} = require('../Controllers/messageController');
const {sendMessage} = require('../Controllers/messageController');
const {deleteMessage} = require('../Controllers/messageController');

router.post('/send', sendMessage);
router.delete('/delete/:messageId' , deleteMessage);
router.get('/fetch/:chatId' , getMessages);

module.exports = router;