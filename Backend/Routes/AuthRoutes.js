const express = require('express');
const router = express.Router();
const authController = require("../Controllers/authController");
const loginController = require("../Controllers/loginController");

router.get('/login' , (req,res)=>{
    res.send('working');

});
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleAuthCallback);
router.post('/google-auth', authController.googleCredentialAuth);
router.post('/login', loginController.login );
router.post('/signup', loginController.signUp);
router.post('/reset-password', loginController.resetPassword);
router.post('/change-password', loginController.changePassword);

module.exports = router;
