const express = require('express');
const router = express.Router();
const {getMessages} = require('../Controllers/messageController');
const {sendMessage} = require('../Controllers/messageController');
const {deleteMessage} = require('../Controllers/messageController');
const {chatMediaUpload} = require('../Utils/chatUpload');

router.post('/send', chatMediaUpload.array('media'), sendMessage);
router.delete('/delete/:messageId' , deleteMessage);
router.get('/fetch/:chatId' , getMessages);

module.exports = router;