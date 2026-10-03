const express = require("express");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const {
  getOAuthProtectedResourceMetadataUrl,
} = require("@modelcontextprotocol/sdk/server/auth/router.js");
const { requireBearerAuth } = require("@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js");
const { createMcpServer } = require("../mcp/tools");
const oauthConfig = require("../config/mcpOAuth");
const oauthProvider = require("../Services/mcpOAuthProviderInstance");
const mcpRateLimitService = require("../Services/mcpRateLimitService");
const { recordMcpAuditEvent } = require("../Services/mcpAuditService");

function createMcpRouter({
  tokenVerifier = oauthProvider,
  userService,
  splitService,
  rateLimitService = mcpRateLimitService,
  auditService = { recordMcpAuditEvent },
} = {}) {
  const router = express.Router();
  const authenticate = requireBearerAuth({
    verifier: tokenVerifier,
    expectedResource: oauthConfig.resourceUrl,
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(
      oauthConfig.resourceUrl
    ),
  });
  const authenticateAndAuditFailures = (req, res, next) => {
    const startedAt = Date.now();
    res.once("finish", () => {
      if (req.auth) return;
      void auditService.recordMcpAuditEvent({
        principal: {
          userId: null,
          clientId: "unverified",
          scopes: [],
        },
        operation: "mcp:authentication",
        outcome: res.statusCode >= 500 ? "error" : "denied",
        httpStatus: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });
    return authenticate(req, res, next);
  };

  router.post("/", authenticateAndAuditFailures, async (req, res) => {
    const authInfo = req.auth;
    const extra = authInfo.extra || {};
    const principal = {
      userId: extra.userId,
      clientId: authInfo.clientId,
      scopes: authInfo.scopes,
      roles: extra.roles || [],
      grantId: extra.grantId,
    };
    if (
      typeof principal.userId !== "string" ||
      typeof principal.clientId !== "string" ||
      !Array.isArray(principal.scopes)
    ) {
      void auditService.recordMcpAuditEvent({
        principal: {
          userId: null,
          clientId: "unverified",
          scopes: [],
        },
        operation: "mcp:authentication",
        outcome: "denied",
        httpStatus: 401,
        durationMs: 0,
      });
      return res.status(401).json({
        error: "OAuth token is missing required MCP identity claims",
      });
    }
    const startedAt = Date.now();
    const requests = Array.isArray(req.body) ? req.body : [req.body];
    const jsonRpcMethod = Array.isArray(req.body)
      ? "batch"
      : req.body?.method;
    const operation = `mcp:${jsonRpcMethod || "unknown"}`;
    const toolCalls = toolCallsForAudit(requests);
    const auditedToolName =
      toolCalls.length === 1
        ? toolCalls[0].params?.name
        : undefined;
    let completedToolCalls = 0;
    let failedToolCall = false;
    let deniedToolCall = false;
    let auditOutcome = "success";
    let auditStatus = 200;
    res.once("finish", () => {
      void auditService.recordMcpAuditEvent({
        principal,
        operation,
        ...(auditedToolName ? { toolName: auditedToolName } : {}),
        outcome:
          auditOutcome !== "success"
            ? auditOutcome
            : deniedToolCall
              ? "denied"
              : failedToolCall || completedToolCalls !== toolCalls.length
                ? "error"
                : "success",
        httpStatus: auditStatus === 200 ? res.statusCode : auditStatus,
        durationMs: Date.now() - startedAt,
        requestId: req.get("x-request-id")?.slice(0, 100),
      });
    });
    for (const toolCall of toolCalls) {
      const toolName = toolCall.params?.name;
      const kind =
        toolName === "update_workout_split" ? "write" : "read";
      try {
        const limit = await rateLimitService.consume({ principal, kind });
        res.set({
          "RateLimit-Limit": String(limit.limit),
          "RateLimit-Remaining": String(limit.remaining),
          "RateLimit-Reset": String(limit.retryAfterSeconds),
        });
        if (!limit.allowed) {
          auditOutcome = "denied";
          auditStatus = 429;
          res.set("Retry-After", String(limit.retryAfterSeconds));
          return res.status(429).json({
            jsonrpc: "2.0",
            error: {
              code: -32005,
              message: "MCP rate limit exceeded",
              data: { retry_after_seconds: limit.retryAfterSeconds },
            },
            id: toolCall.id ?? null,
          });
        }
      } catch (error) {
        console.error("MCP rate limit check failed:", error.message);
        auditOutcome = "error";
        auditStatus = 503;
        return res.status(503).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "MCP request unavailable" },
          id: toolCall.id ?? null,
        });
      }
    }

    const mcpServer = createMcpServer({
      principal,
      userService,
      splitService,
      auditEvent: auditService.recordMcpAuditEvent,
      onToolExecution({ outcome }) {
        completedToolCalls += 1;
        if (outcome === "denied") deniedToolCall = true;
        if (outcome === "error") failedToolCall = true;
      },
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
      auditOutcome = "error";
      auditStatus = 500;
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

function toolCallsForAudit(requests) {
  return requests.filter((request) => request?.method === "tools/call");
}

module.exports = createMcpRouter;
