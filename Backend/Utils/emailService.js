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
            to, // Sending to the same email address
            subject,
            html
        });
        console.log("Email sent successfully to:", to);
    } catch (error) {
        console.error("Error sending email:", error.message);
    }
};
module.exports = {
    sendEmail
};