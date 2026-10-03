const jwt = require("jsonwebtoken");

function createMcpAuth({ secret = process.env.ACCESS_TOKEN_SECRET } = {}) {
  return (req, res, next) => {
    if (!secret) {
      return res.status(500).json({
        error: "MCP authentication is not configured",
      });
    }

    const authorization = req.get("authorization") || "";
    const match = authorization.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "A bearer access token is required",
      });
    }

    try {
      const decoded = jwt.verify(match[1], secret);
      if (
        typeof decoded.sub !== "string" ||
        !decoded.sub ||
        decoded.type !== "access" ||
        decoded.role === "gym"
      ) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "A valid user access token is required",
        });
      }

      req.mcpUser = {
        id: decoded.sub,
        role: decoded.role || "user",
        scopes: Array.isArray(decoded.scope)
          ? decoded.scope
          : typeof decoded.scope === "string"
            ? decoded.scope.split(/\s+/)
            : [],
      };
      return next();
    } catch (error) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired access token",
      });
    }
  };
}

module.exports = createMcpAuth;
