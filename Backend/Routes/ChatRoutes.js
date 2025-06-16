
const express = require('express');
const router = express.Router();
const {getUserChats} = require('../Controllers/chatController');
const {createUserChat} =require('../Controllers/chatController');


router.get('/getChats' , getUserChats);
router.get('/:userId/:receiverId' , createUserChat );
module.exports=router;

