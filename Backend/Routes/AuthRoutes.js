const express = require('express');
const router = express.Router();
const authController = require("../Controllers/authController");
const loginController = require("../Controllers/loginController");

const {savePushToken}= require("../Controllers/NotificationController");

router.get('/login' , (req,res)=>{
    res.send('working');

});
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleAuthCallback);
router.post('/login', loginController.login );
router.post('/signup', loginController.signUp);
router.post('/refresh', loginController.refreshToken );
router.post('/change-password', loginController.changePassword);
router.post('/reset-password' , loginController.resetPassword);
// notfications 
router.post('/push-token', savePushToken);

router.post("/google-auth", loginController.googleAuthentication);


module.exports = router;
