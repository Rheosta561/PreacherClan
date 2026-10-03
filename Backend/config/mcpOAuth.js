require("dotenv").config({
  path: require("node:path").join(__dirname, "..", ".env"),
});

const isProduction = process.env.NODE_ENV === "production";
const localIssuer = `http://localhost:${process.env.PORT || 3000}`;
const issuerValue = process.env.MCP_ISSUER_URL || (isProduction ? "" : localIssuer);

if (!issuerValue) {
  throw new Error("MCP_ISSUER_URL must be configured in production");
}

const issuerUrl = new URL(issuerValue);
if (isProduction && issuerUrl.protocol !== "https:") {
  throw new Error("MCP_ISSUER_URL must use HTTPS in production");
}
if (
  issuerUrl.search ||
  issuerUrl.hash ||
  issuerUrl.username ||
  issuerUrl.password
) {
  throw new Error("MCP_ISSUER_URL must not include credentials, a query, or a fragment");
}

const resourceUrl = new URL(
  process.env.MCP_RESOURCE_URL || new URL("/mcp", issuerUrl).href
);
if (isProduction && resourceUrl.protocol !== "https:") {
  throw new Error("MCP_RESOURCE_URL must use HTTPS in production");
}
if (
  resourceUrl.search ||
  resourceUrl.hash ||
  resourceUrl.username ||
  resourceUrl.password
) {
  throw new Error("MCP_RESOURCE_URL must not include credentials, a query, or a fragment");
}

const consentUrlValue =
  process.env.MCP_CONSENT_URL ||
  (isProduction ? "" : "http://localhost:3001/auth/mcp/authorize");
if (!consentUrlValue) {
  throw new Error("MCP_CONSENT_URL must be configured in production");
}
const consentUrl = new URL(consentUrlValue);
if (isProduction && consentUrl.protocol !== "https:") {
  throw new Error("MCP_CONSENT_URL must use HTTPS in production");
}
if (consentUrl.search || consentUrl.hash) {
  throw new Error("MCP_CONSENT_URL must not include a query or fragment");
}

const accessTokenSecret =
  process.env.MCP_ACCESS_TOKEN_SECRET ||
  (!isProduction ? process.env.ACCESS_TOKEN_SECRET : "");
if (!accessTokenSecret) {
  throw new Error("MCP_ACCESS_TOKEN_SECRET is required");
}
if (Buffer.byteLength(accessTokenSecret) < 32) {
  throw new Error("MCP_ACCESS_TOKEN_SECRET must be at least 32 bytes long");
}

const parsePositiveInteger = (value, fallback, name) => {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
};

module.exports = {
  issuerUrl,
  resourceUrl,
  consentUrl,
  accessTokenSecret,
  accessTokenTtlSeconds: parsePositiveInteger(
    process.env.MCP_ACCESS_TOKEN_TTL_SECONDS,
    600,
    "MCP_ACCESS_TOKEN_TTL_SECONDS"
  ),
  refreshTokenTtlSeconds: parsePositiveInteger(
    process.env.MCP_REFRESH_TOKEN_TTL_SECONDS,
    60 * 60 * 24 * 30,
    "MCP_REFRESH_TOKEN_TTL_SECONDS"
  ),
  authorizationRequestTtlSeconds: 10 * 60,
  authorizationCodeTtlSeconds: 60,
  scopes: [
    "mcp:read:user",
    "mcp:read:split",
    "mcp:write:split",
  ],
  defaultScopes: ["mcp:read:user", "mcp:read:split"],
  devTokensEnabled:
    !isProduction && process.env.MCP_DEV_TOKEN_ENABLED === "true",
};
