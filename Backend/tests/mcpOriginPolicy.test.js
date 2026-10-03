const assert = require("node:assert/strict");
const test = require("node:test");
const { shouldEnforceMcpOrigin } = require("../Utils/mcpOriginPolicy");

test("OAuth and discovery endpoints are not blocked by the MCP tool origin allowlist", () => {
  for (const path of [
    "/authorize",
    "/register",
    "/token",
    "/revoke",
    "/.well-known/oauth-authorization-server",
    "/.well-known/oauth-protected-resource/mcp",
  ]) {
    assert.equal(shouldEnforceMcpOrigin(path), false, path);
  }
});

test("MCP endpoints continue to enforce the configured origin allowlist", () => {
  assert.equal(shouldEnforceMcpOrigin("/mcp"), true);
  assert.equal(shouldEnforceMcpOrigin("/mcp/"), true);
  assert.equal(shouldEnforceMcpOrigin("/mcp/oauth/requests/transaction"), true);
  assert.equal(shouldEnforceMcpOrigin("/unrelated"), false);
});
