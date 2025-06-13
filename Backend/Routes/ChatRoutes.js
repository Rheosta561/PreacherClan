
const express = require('express');
const router = express.Router();
const {getUserChats} = require('../Controllers/chatController');


router.get('/getChats' , getUserChats);
module.exports=router;

