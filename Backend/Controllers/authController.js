const passport = require("passport");
const User = require("../Models/User");
const jwt = require('jsonwebtoken');
const generateTokens = require('../Utils/generateTokens');

const createUniqueUsername = async (name, email) => {
  const base = (name || email.split('@')[0]).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'user';
  let username = base;
  let suffix = 1;

  while (await User.exists({ username })) {
    username = `${base}${suffix}`;
    suffix += 1;
  }

  return username;
};

exports.googleCredentialAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ message: 'Google ID token is required' });
    }

    const googleResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (!googleResponse.ok) {
      return res.status(401).json({ message: 'Invalid Google ID token' });
    }

    const googleUser = await googleResponse.json();
    const configuredClientId = process.env.GOOGLE_CLIENT_ID;
    if (configuredClientId && googleUser.aud !== configuredClientId) {
      return res.status(401).json({ message: 'Google ID token audience mismatch' });
    }

    if (googleUser.email_verified !== 'true' || !googleUser.email) {
      return res.status(401).json({ message: 'A verified Google email is required' });
    }

    let user = await User.findOne({ email: googleUser.email });
    if (!user) {
      user = await User.create({
        name: googleUser.name || googleUser.email.split('@')[0],
        email: googleUser.email,
        username: await createUniqueUsername(googleUser.name, googleUser.email),
        profilePic: googleUser.picture,
      });
    }

    const tokens = generateTokens({ userId: user._id.toString(), role: 'user' });
    return res.status(200).json({
      message: 'Google authentication successful',
      ...tokens,
      user,
    });
  } catch (error) {
    console.error('Google credential authentication error:', error.message);
    return res.status(500).json({ message: 'Google authentication failed' });
  }
};

exports.googleAuth = passport.authenticate("google", { scope: ["profile", "email"] });

exports.googleAuthCallback = (req, res, next) => {
    passport.authenticate("google", async (err, user) => {
      if (err || !user) {
        console.log(err.message);
        return res.redirect("http://localhost:5173/login?error=authentication_failed");
      }
  

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  

      return res.redirect(`http://localhost:5173/dashboard?token=${token}`);
    })(req, res, next);
  };
