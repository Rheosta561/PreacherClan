const User = require('../Models/User');
const bcrypt = require('bcrypt');
const { randomBytes } = require('node:crypto');
const generateTokens = require('../Utils/generateTokens');
const emailService = require('../Utils/emailService');
require('dotenv').config();

const sendEmailInBackground = (message) => {
    void emailService.sendEmail(message).catch((error) => {
        console.error("Email delivery failed:", error.message);
    });
};

const getEmailGreetingName = (user) => {
    const name = [user?.name, user?.username, user?.email?.split("@")[0]]
        .find((value) => typeof value === "string" && value.trim());
    return (name || "there")
        .trim()
        .replace(/[&<>"']/g, (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        })[character]);
};

exports.login = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const identifier = (email || username || "").trim();
        const user = await User.findOne({
            $or: [
                { username: identifier },
                { email: identifier.toLowerCase() },
            ],
        });

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
                    <p><b>Hi ${getEmailGreetingName(user)},</b></p>
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

        // Send email asynchronously in the background
        sendEmailInBackground({
            to: user.email,
            subject: "Login Alert",
            html: htmlContent,
        });

        const safeUser = typeof user.toObject === 'function' ? user.toObject() : { ...user };
        delete safeUser.password;
        const tokens = generateTokens({
            userId: user._id.toString(),
            role: 'user',
        });

        return res.status(200).json({
            user: safeUser,
            message: "Access Granted",
            ...tokens,
        });
    } catch (error) {
        console.error("Login failed:", error.message);
        const statusCode = error.code === "JWT_CONFIG_MISSING" ? 500 : 400;
        return res.status(statusCode).json({ error: error.message });
    }
};

exports.signUp = async (req, res) => {
    try {
        const { name, email, username, password } = req.body;
        if (![name, email, username, password].every((value) => typeof value === "string" && value.trim())) {
            return res.status(400).json({ error: "Name, email, username, and password are required" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedUsername = username.trim();
        const existingUser = await User.findOne({
            $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
        });
        if (existingUser?.username === normalizedUsername) {
            return res.status(409).json({ error: "Username already exists" });
        }
        if (existingUser) {
            return res.status(409).json({ error: "Email already exists" });
        }

        const newUser = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            username: normalizedUsername,
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
                <p><b>Hi ${getEmailGreetingName(newUser)},</b></p>
                <p>Welcome to <b>Preacher Clan</b>! We are thrilled to have you join our growing community of fitness enthusiasts.</p>
                <p>Preacher Clan is all about collecting ideas from workout lovers to revolutionize fitness in India. Our vision is to build a strong and supportive community where fitness is not just a routine but a movement.</p>
                
                <hr>
                <p>We're here to support you on your fitness journey—let’s push together for <strong>" Ek Rep Aur "</strong> !</p>
                <p>See you at the top,</p>
                <p><b>Team Preacher Clan</b></p>

            </div>
    

        `;

        // Send email asynchronously in the background
        sendEmailInBackground({
            to: normalizedEmail,
            subject: "Welcome to PreacherClan!",
            html: htmlContent,
        });

        const safeUser = typeof newUser.toObject === "function" ? newUser.toObject() : { ...newUser };
        delete safeUser.password;
        const tokens = generateTokens({ userId: newUser._id.toString(), role: "user" });
        return res.status(201).json({
            user: safeUser,
            message: "Registered Successfully",
            ...tokens,
        });
        
    } catch (error) {
        console.error("Signup failed:", error.message);
        return res.status(500).json({ error: "Something went wrong", message: "Something went wrong" });
    }
};

const findUserByEmail = (email) => {
    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return User.findOne({ email: new RegExp(`^${escapedEmail}$`, "i") });
};

exports.resetPassword = async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(200).json({
                message: "If an account exists for that email, a temporary password has been sent.",
            });
        }

        const previousPasswordHash = user.password;
        const temporaryPassword = randomBytes(18).toString("base64url");
        user.password = await bcrypt.hash(temporaryPassword, 10);
        await user.save();

        try {
            await emailService.sendEmail({
                to: user.email,
                subject: "Your PreacherClan temporary password",
                text: `Your temporary password is: ${temporaryPassword}\nSign in and change it immediately.`,
                html: `<p>Your temporary password is:</p><p><strong>${temporaryPassword}</strong></p><p>Sign in and change it immediately.</p>`,
            });
        } catch (error) {
            user.password = previousPasswordHash;
            try {
                await user.save();
            } catch (rollbackError) {
                console.error("Could not restore password after email failure:", rollbackError.message);
            }
            throw error;
        }

        return res.status(200).json({
            message: "If an account exists for that email, a temporary password has been sent.",
        });
    } catch (error) {
        console.error("Password reset failed:", error.message);
        return res.status(500).json({ message: "Unable to reset password right now" });
    }
};

exports.changePassword = async (req, res) => {
    const { email, previousPassword, newPassword } = req.body || {};
    if (![email, previousPassword, newPassword].every((value) => typeof value === "string" && value.trim())) {
        return res.status(400).json({ message: "Email and both passwords are required" });
    }

    try {
        const user = await findUserByEmail(email.trim());
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (!user.password || !(await bcrypt.compare(previousPassword, user.password))) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        return res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Password change failed:", error.message);
        return res.status(500).json({ message: "Unable to update password right now" });
    }
};