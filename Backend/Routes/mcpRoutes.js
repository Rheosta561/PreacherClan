const express = require("express");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const createMcpAuth = require("../Middleware/mcpAuth");
const { createMcpServer } = require("../mcp/tools");

function createMcpRouter({
  authSecret,
  userService,
  splitService,
} = {}) {
  const router = express.Router();
  const authenticate = createMcpAuth({ secret: authSecret });

  router.post("/", authenticate, async (req, res) => {
    const mcpServer = createMcpServer({
      userId: req.mcpUser.id,
      scopes: req.mcpUser.scopes,
      userService,
      splitService,
    });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    try {
      await mcpServer.connect(transport);
      res.once("close", () => {
        void Promise.all([transport.close(), mcpServer.close()]).catch((error) => {
          console.error("Failed to close MCP request resources:", error);
        });
      });
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP request failed:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
      if (!res.writableEnded) {
        await Promise.all([transport.close(), mcpServer.close()]);
      }
    }
  });

  const methodNotAllowed = (_req, res) =>
    res
      .set("Allow", "POST")
      .status(405)
      .json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed" },
        id: null,
      });
  router.get("/", methodNotAllowed);
  router.delete("/", methodNotAllowed);

  return router;
}

module.exports = createMcpRouter;
