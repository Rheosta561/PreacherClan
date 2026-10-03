const express = require("express");
const {
  OAuthError,
  ServerError,
} = require("@modelcontextprotocol/sdk/server/auth/errors.js");
const auth = require("../Middleware/auth");
const oauthConfig = require("../config/mcpOAuth");
const provider = require("../Services/mcpOAuthProviderInstance");

const router = express.Router();

const requireUserAccessToken = (req, res, next) => {
  if (req.user?.tokenType !== "access" || req.user?.role !== "user") {
    return res.status(401).json({
      error: "A Preacher Clan user access token is required",
    });
  }
  return next();
};

const sendOAuthRouteError = (res, error, fallbackMessage) => {
  const explicitStatus = Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode < 500
    ? error.statusCode
    : null;
  const status =
    explicitStatus ||
    (error instanceof ServerError
      ? 500
      : error instanceof OAuthError
        ? 400
        : 500);
  if (status >= 500 || error instanceof ServerError) {
    console.error("MCP OAuth request failed:", error.message);
  }
  return res.status(status).json({
    error: status === 400 ? fallbackMessage : "Unable to process authorization",
  });
};

router.get("/requests/:transactionId", async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const authorizationRequest = await provider.getAuthorizationRequest(
      req.params.transactionId
    );
    return res.status(200).json(authorizationRequest);
  } catch (error) {
    return sendOAuthRouteError(
      res,
      error,
      "Authorization request is invalid or expired"
    );
  }
});

router.post(
  "/requests/:transactionId/approve",
  auth,
  requireUserAccessToken,
  async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      const redirectUrl = await provider.approveAuthorization(
        req.params.transactionId,
        req.user.id,
        req.body?.scopes
      );
      return res.status(200).json({ redirectUrl });
    } catch (error) {
      return sendOAuthRouteError(
        res,
        error,
        "Authorization request is invalid or expired"
      );
    }
  }
);

router.post("/requests/:transactionId/deny", async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const redirectUrl = await provider.denyAuthorization(
      req.params.transactionId
    );
    return res.status(200).json({ redirectUrl });
  } catch (error) {
    return sendOAuthRouteError(
      res,
      error,
      "Authorization request is invalid or expired"
    );
  }
});

router.post("/dev-token", auth, requireUserAccessToken, async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (!oauthConfig.devTokensEnabled) {
    return res.status(404).json({ error: "Development tokens are disabled" });
  }

  const { clientId, scopes } = req.body || {};
  if (
    typeof clientId !== "string" ||
    !/^[a-zA-Z0-9._:-]{1,100}$/.test(clientId)
  ) {
    return res.status(400).json({ error: "A valid clientId is required" });
  }
  const requestedScopes =
    scopes === undefined ? oauthConfig.defaultScopes : scopes;
  if (
    !Array.isArray(requestedScopes) ||
    requestedScopes.some((scope) => !oauthConfig.scopes.includes(scope)) ||
    new Set(requestedScopes).size !== requestedScopes.length
  ) {
    return res.status(400).json({ error: "Invalid development token scopes" });
  }

  try {
    const token = await provider.issueDevelopmentToken(
      req.user.id,
      clientId,
      requestedScopes
    );
    return res.status(200).json(token);
  } catch (error) {
    console.error("Development MCP token issuance failed:", error.message);
    return res.status(500).json({ error: "Unable to issue development token" });
  }
});

module.exports = router;
