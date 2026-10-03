const OAUTH_ENDPOINTS = new Set([
  "/authorize",
  "/register",
  "/token",
  "/revoke",
]);

function shouldEnforceMcpOrigin(path) {
  if (OAUTH_ENDPOINTS.has(path) || path.startsWith("/.well-known/")) {
    return false;
  }
  return path === "/mcp" || path.startsWith("/mcp/");
}

module.exports = { shouldEnforceMcpOrigin };
