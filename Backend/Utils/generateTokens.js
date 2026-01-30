const jwt = require("jsonwebtoken");

function generateTokens({ userId, role }) {
  const accessToken = jwt.sign(
    {
      sub: userId,
      role,
      type: "access",
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
    }
  );

  const refreshToken = jwt.sign(
    {
      sub: userId,
      type: "refresh",
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "30d",
    }
  );

  return { accessToken, refreshToken };
}

module.exports = generateTokens;
