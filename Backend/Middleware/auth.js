const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  try {
    let token = null;

// header mobile 
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

// cookies 
    if (!token && req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }


    if (!token) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "No token provided",
      });
    }


    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );

    req.user = {
      id: decoded.sub,
      role: decoded.role,
      tokenType: decoded.type,
    };

    return next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or expired token",
    });
  }
};
