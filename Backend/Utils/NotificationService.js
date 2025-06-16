const Notification = require('../Models/Notification');
const User = require('../Models/User');
const {onlineUsers , getIo} = require('../socket');
const emailService = require('../Utils/emailService');

const sendNotification = async (user, message, type , link='') => {
    const notification = new Notification({
        userId: user._id,
        message,
        type
    });

    await notification.save();
    
const html = `<!DOCTYPE html>
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
            background: #fff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding: 15px;
            background: #000000;
            color: white;
            border-radius: 10px 10px 0 0;
        }
        .content {
            padding: 20px;
            color: #333;
        }
        .title {
            font-size: 1.5rem;
            font-weight: bold;
            margin-bottom: 10px;
            color: #ba047e;
            text-align: center;
        }
        .message {
            font-size: 1rem;
            margin-bottom: 20px;
            text-align: center;
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
            height: 60px;
            width: auto;
            margin-bottom: 10px;
        }
        .link-button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #ba047e;
            color: #fff;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin-top: 20px;
        }
        /* Responsive */
        @media screen and (max-width: 480px) {
            .container {
                margin: 10px;
                padding: 15px;
            }
            .title {
                font-size: 1.25rem;
            }
            .message {
                font-size: 0.9rem;
            }
            .logo {
                height: 50px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://i.pinimg.com/736x/18/77/2d/18772d8fe4fe3dafe5a34fdbdff8b9d7.jpg" alt="Preacher Clan Logo" class="logo" />
        </div>
        <div class="content">
            <div class="title">Notification from Preacher Clan</div>
            <div class="message">
                Dear <b>${user.name}</b>,<br /><br />
                ${notification.message}
                ${
                  link && link.trim() !== ''
                    ? `<br /><br /><a href="${link}" class="link-button">View Details</a>`
                    : ''
                }
            </div>
            <hr />
            <div style="text-align:center; font-style: italic; color: #555;">
                Thank you for being part of our community.<br />
                Stay strong, stay motivated!
            </div>
        </div>
        <div class="footer">
            Preacher Clan &copy; 2025 — All rights reserved.
        </div>
    </div>
</body>
</html>`;


    
        await emailService.sendEmail(
            user.email,
             'You Have a New Notification',
            html
        );

    

    const socketId = onlineUsers.get(user._id.toString());
    if (socketId) {
        const io = getIo();
        io.to(socketId).emit('notification', notification);
    }
}
module.exports = {
    sendNotification,}