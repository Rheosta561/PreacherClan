const jwt = require("jsonwebtoken");

function generateTokens({ userId, role }) {
  const missingSecrets = ["ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"]
    .filter((key) => !process.env[key]);

  if (missingSecrets.length) {
    const error = new Error(`Missing required JWT secrets: ${missingSecrets.join(", ")}`);
    error.code = "JWT_CONFIG_MISSING";
    throw error;
  }

  const accessToken = jwt.sign(
    {
      sub: userId,
      role,
      type: "access",
      scope: role === "user" ? ["mcp:write:split"] : [],
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
