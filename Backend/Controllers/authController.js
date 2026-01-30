const passport = require("passport");
const User = require("../Models/User");

const generateTokens = require("../Utils/generateTokens");
const hashToken = require("../Utils/hashToken");

const setAccessCookie = (res, token) => {
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    maxAge: 15 * 60 * 1000, 
  });
};

// google auth 

exports.googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
});

// callback 

exports.googleAuthCallback = (req, res, next) => {
  passport.authenticate("google", async (err, user) => {
    try {
      if (err || !user) {
        console.error(err?.message);
        return res.redirect(
          "https://preacherclan.vercel.app/login?error=authentication_failed"
        );
      }

// generate tokens
      const { accessToken, refreshToken } = generateTokens({
        userId: user._id,
        role: user.role,
      });

// storinng refresh token 
      user.refreshTokenHash = hashToken(refreshToken);
      await user.save();

// set cookie web 
      setAccessCookie(res, accessToken);


      return res.redirect(
        "https://preacherclan.vercel.app/dashboard"
      );
    } catch (e) {
      console.error("Google callback error:", e);
      return res.redirect(
        "https://preacherclan.vercel.app/login?error=server_error"
      );
    }
  })(req, res, next);
};
