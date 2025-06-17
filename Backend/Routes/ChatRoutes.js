
const express = require('express');
const router = express.Router();
const {getUserChats} = require('../Controllers/chatController');
const {createUserChat} =require('../Controllers/chatController');


router.post('/getChats' , getUserChats);
router.get('/:userId/:receiverId' , createUserChat );
module.exports=router;

