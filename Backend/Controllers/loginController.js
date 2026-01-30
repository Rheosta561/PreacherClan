const User = require("../Models/User");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

const generateTokens = require("../Utils/generateTokens");
const hashToken = require("../Utils/hashToken");
const generateUsername = require('../Utils/generateUsername');

require("dotenv").config();
const { OAuth2Client } = require("google-auth-library");



const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

/**
 * GOOGLE LOGIN / SIGNUP
 * mobile + web supported
 */
exports.googleAuthentication = async (req, res) => {
  try {
    console.log('google auth starts');
    const { idToken, mobileUser } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: "Google token missing" });
    }

    // Verify token with Google
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_WEB_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const {
      sub: googleId,
      email,
      name,
      picture,
    } = payload;

    // onboarding chcek 
    let isNewUser = false; 

    // Find existing user
    let user = await User.findOne({
      $or: [{ googleId }, { email }],
    });

    const username = await generateUsername({ name, email });


    
    if (!user) {
      user = await User.create({
        name,
        email,
        username,
        googleId,
        provider: "google",
        profileImage: picture,
      });

      sendEmail(
        email,
        "Welcome to Preacher Clan ⚔️",
        `<p>Welcome <b>${name}</b> to Preacher Clan</p>`
      );
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      userId: user._id,
      role: user.role,
    });

    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    const { password, refreshTokenHash, ...safeUser } = user.toObject();

    // Mobile vs Web
    if (mobileUser) {
      return res.json({
        message: "Google login successful",
        accessToken,
        refreshToken,
        user: safeUser,
      });
    }

    setAccessCookie(res, accessToken);
    return res.json({
      message: "Google login successful",
      user: safeUser,
    });

  } catch (err) {
    console.error("Google auth error:", err);
    return res.status(401).json({ error: "Google authentication failed" });
  }
};

// email setup 

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("Email error:", err.message);
  }
};

// cookiehelper 

const setAccessCookie = (res, token) => {
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", 
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 15 * 60 * 1000,
  });
};


// login

exports.login = async (req, res) => {
  try {
    const { username, email, password, mobileUser } = req.body;
    const isMobileUser = mobileUser === true;

    let user = await User.findOne({ username }) || await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const { accessToken, refreshToken } = generateTokens({
      userId: user._id,
      role: user.role,
    });
    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

// alert login email 
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const device = `${req.useragent?.platform || "Unknown"} - ${req.useragent?.browser || "Unknown"}`;
    const time = new Date().toLocaleString();

   sendEmail(
      user.email,
      "New Login Alert – Preacher Clan",
      `<p>New login detected</p>
       <p><b>Device:</b> ${device}</p>
       <p><b>IP:</b> ${ip}</p>
       <p><b>Time:</b> ${time}</p>`
    );

    const { password: _, refreshTokenHash, ...safeUser } = user.toObject();

// mobile 
    if (isMobileUser) {
      return res.json({
        message: "Login successful",
        accessToken,
        refreshToken,
        user: safeUser,
      });
    }

// web 
    setAccessCookie(res, accessToken);
     return res.json({
        message: "Login successful",
        accessToken,
        refreshToken,
        user: safeUser,
      });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
};

// signup 

exports.signUp = async (req, res) => {
  try {
    const { name, email, username, password, mobileUser } = req.body;

    if (!name || !email || !username || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const exists = await User.findOne({ username });
    const emailExists = await User.findOne({email});
    if (exists) {
      return res.status(409).json({ error: "Username already exists" });
    }
    if(emailExists){
      return res.status(409).json({error : 'Email Already exists '});
    }

    const user = await User.create({
      name,
      email,
      username,
      password: await bcrypt.hash(password, 10),
    });

    const { accessToken, refreshToken } = generateTokens({
      userId: user._id,
      role: user.role,
    });

    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    sendEmail(
      email,
      "Welcome to Preacher Clan",
      `<p>Welcome <b>${username}</b> to Preacher Clan ⚔️</p>`
    );

    const { password: _, refreshTokenHash, ...safeUser } = user.toObject();

    if (mobileUser) {
      return res.status(201).json({
        message: "Signup successful",
        accessToken,
        refreshToken,
        user: safeUser,
      });
    }

    setAccessCookie(res, accessToken);
    return res.redirect("https://preacherclan.vercel.app/dashboard");

  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Signup failed" });
  }
};

// refreshOTken and refresh session 

exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token missing" });
    }

    const decoded = require("jsonwebtoken").verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decoded.sub).select("+refreshTokenHash");
    if (!user || user.refreshTokenHash !== hashToken(refreshToken)) {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    const tokens = generateTokens({
      userId: user._id,
      role: user.role,
    });

    user.refreshTokenHash = hashToken(tokens.refreshToken);
    await user.save();

    setAccessCookie(res, tokens.accessToken);

    return res.json(tokens);
  } catch (err) {
    return res.status(403).json({ error: "Token expired" });
  }
};

// logout

exports.logout = (req, res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    sameSite: "none",
    secure: true,
  });

  return res.json({ message: "Logged out" });
};
