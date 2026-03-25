const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

const createSessionId = () => crypto.randomBytes(32).toString("hex");

const signAccessToken = ({ gymId, username }) => {
  return jwt.sign(
    {
      sub: String(gymId),
      username,
      role: "gym",
      type: "access",
    },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
};

const signRefreshToken = ({ gymId, sessionId }) => {
  return jwt.sign(
    {
      sub: String(gymId),
      sid: sessionId,
      role: "gym",
      type: "refresh",
    },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiresIn }
  );
};

const verifyAccessToken = (token) => jwt.verify(token, env.jwt.accessSecret);
const verifyRefreshToken = (token) => jwt.verify(token, env.jwt.refreshSecret);

module.exports = {
  createSessionId,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
