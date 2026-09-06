const passport = require("passport");
const User = require("../Models/User");
const jwt = require('jsonwebtoken');

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
