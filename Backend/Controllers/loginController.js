const User = require('../Models/User');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
require('dotenv').config();
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,  
        pass: process.env.PASS      
    }
});

const sendEmail = async (to, subject, html) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL,
            to,
            subject,
            html
        });
    } catch (error) {
        console.error("Error sending email:", error.message);
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({ error: "User not found", code: "404" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Access Denied", code: "401" });
        }

        // Get login details
        const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
        const device = `${req.useragent.platform} - ${req.useragent.browser}`;
        const time = new Date().toLocaleString();

        // Email content
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background: #f4f4f4; }
                .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px; background: #f9f9f9; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                .header { text-align: center; padding: 10px; background: #000000; color: white; border-radius: 10px 10px 0 0; }
                .content { padding: 20px; color: #333; }
                .footer { text-align: center; padding: 10px; font-size: 0.9rem; color: #888; border-top: 1px solid #ccc; margin-top: 20px; }
                .logo { height: 50px; width: 50px; border-radius: 0.5rem; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="https://i.pinimg.com/736x/18/77/2d/18772d8fe4fe3dafe5a34fdbdff8b9d7.jpg" class="logo" alt="Preacher Clan Logo">
                </div>
                <div class="content">
                    <p><b>Hi ${username},</b></p>
                    <p>We noticed a new login to your <b>Preacher Clan</b> account.</p>
                    <p><b>Login Details:</b></p>
                    <p><b>Device:</b> ${device}</p>
                    <p><b>IP Address:</b> ${ipAddress}</p>
                    <p><b>Time:</b> ${time}</p>
                    <hr>
                    <p>If this was you, no further action is required.</p>
                    <p>If you didn’t log in, please reset your password immediately.</p>
                    <p>Stay safe and secure!</p>
                    <p><b>Team Preacher Clan</b></p>
                </div>
            </div>
        </body>
        </html>`;

        await sendEmail(user.email, "Login Alert", htmlContent);

        return res.status(200).json({ user, message: "Access Granted" });

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.signUp= async(req,res)=>{
    try {
        const{name , email ,username,password}= req.body;
        const existingUser = await User.findOne({username});
        if(existingUser){
            res.status(401).json({error:"Username already exists"});
        }
        const newUser = await User.create({
            name,
            email,
            username,
            password: await bcrypt.hash(password,10)
        });
        const htmlContent = `
           <!DOCTYPE html>
<html>
    <head>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 0;
                background: #f4f4f4;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                padding: 20px;
                border: 1px solid #ccc;
                border-radius: 10px;
                background: #f9f9f9;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                padding: 10px;
                background: #000000;
                color: white;
                border-radius: 10px 10px 0 0;
                overflow: hidden;
            }
            .content {
                padding: 20px;
                color: #333;
            }
            .otp {
                font-size: 1.5rem;
                color: #ba047e;
                font-weight: bold;
                text-align: center;
                display: block;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                padding: 10px;
                font-size: 0.9rem;
                color: #888;
                border-top: 1px solid #ccc;
                margin-top: 20px;
            }
            .logo {
                height: 50%;
                width: 50%;
                transform: scale(1.2);
                border-radius: 0.5rem;
            }

            /* Media Query for Smaller Screens */
            @media screen and (max-width: 768px) {
                .container {
                    margin: 10px;
                    padding: 15px;
                }
                .content {
                    padding: 15px;
                }
                .otp {
                    font-size: 1.25rem;
                }
                .logo {
                    width: 60%;
                    transform: scale(1);
                    height: 50%;
                }
            }

            @media screen and (max-width: 480px) {
                .container {
                    margin: 10px;
                    padding: 10px;
                }
                .content {
                    padding: 10px;
                }
                .otp {
                    font-size: 1rem;
                }
                .logo {
                    width: 70%;
                    height: 50%;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://i.pinimg.com/736x/18/77/2d/18772d8fe4fe3dafe5a34fdbdff8b9d7.jpg" class="logo" alt="Preacher Clan Logo">
            </div>
            <div class="content">
                <p><b>Hi ${username},</b></p>
                <p>Welcome to <b>Preacher Clan</b>! We are thrilled to have you join our growing community of fitness enthusiasts.</p>
                <p>Preacher Clan is all about collecting ideas from workout lovers to revolutionize fitness in India. Our vision is to build a strong and supportive community where fitness is not just a routine but a movement.</p>
                
                <hr>
                <p>We're here to support you on your fitness journey—let’s push together for <strong>" Ek Rep Aur "</strong> !</p>
                <p>See you at the top,</p>
                <p><b>Team Preacher Clan</b></p>

            </div>
    

        `;

        await sendEmail(email, "Welcome to PreacherClan!", htmlContent);

        res.status(200).json({user:newUser, message:"Registered Successfully"});
        
    } catch (error) {
        res.status(404).json({error:"Something went wrong" , message:"Something went wrong"});
        console.log(error.message);
        
    }
}