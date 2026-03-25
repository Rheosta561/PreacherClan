const Gym = require("../Models/GymSchema");
const env = require("../config/env");
const { verifyAccessToken } = require("../Utils/jwt");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    if (!token && req.cookies?.[env.accessCookie.name]) {
      token = req.cookies[env.accessCookie.name];
    }

    if (!token) {
      return res.status(401).json({ message: "Access token is required" });
    }

    const decoded = verifyAccessToken(token);
    if (decoded.type !== "access" || decoded.role !== "gym") {
      return res.status(401).json({ message: "Invalid access token" });
    }

    const gym = await Gym.findById(decoded.sub).select("_id username isActive");
    if (!gym || !gym.isActive) {
      return res.status(401).json({ message: "Gym account is unavailable" });
    }

    req.gym = {
      id: gym._id,
      username: gym.username,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
};
