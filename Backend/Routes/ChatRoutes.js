
const express = require('express');
const router = express.Router();
const {getUserChats} = require('../Controllers/chatController');
const {createUserChat , searchUserChats , deleteChatForMe} =require('../Controllers/chatController');


router.post('/getChats' , getUserChats);
router.get('/:userId/:receiverId' , createUserChat );
router.post('/:userId/:receiverId' , createUserChat);
router.post('/search' , searchUserChats );
router.delete('/delete/:chatId', deleteChatForMe);
module.exports=router;

