const express = require('express');
const router = express.Router();
const authController = require("../Controllers/authController");
const loginController = require("../Controllers/loginController");

router.get('/login' , (req,res)=>{
    res.send('working');

});
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleAuthCallback);
router.post('/login', loginController.login );
router.post('/signup', loginController.signUp);

module.exports = router;
