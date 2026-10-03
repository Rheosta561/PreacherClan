const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const {
  StreamableHTTPClientTransport,
} = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const {
  InvalidTokenError,
} = require("@modelcontextprotocol/sdk/server/auth/errors.js");
const createMcpRouter = require("../Routes/mcpRoutes");
const oauthConfig = require("../config/mcpOAuth");

const ACCESS_TOKEN = "mcp-test-token";
const USER_ID = "65f00a000000000000000001";
const CLIENT_ID = "test-agent";

async function startServer({
  scopes = ["mcp:read:user", "mcp:read:split"],
  userId = USER_ID,
  userService = {
    async getUserContext(authenticatedUserId, options) {
      return {
        user: { id: authenticatedUserId },
        profile: { fitnessGoals: ["Strength"] },
        recentSessions: options.includeTrainingHistory ? [] : [],
      };
    },
  },
  splitService = {
    async getCurrentWorkoutSplit() {
      return {
        split_id: "my-split",
        split_name: "Test Split",
        description: "Test",
        creator: "Test User",
        exercises: [{ day: "Mo", name: "Bench Press", sets: 3, reps: 8 }],
      };
    },
    async updateCurrentWorkoutSplit(_userId, changes) {
      return {
        split: {
          split_id: "my-split",
          split_name: changes.split_name || "Test Split",
          description: changes.description || "Test",
          creator: "Test User",
          exercises: (changes.day_overrides || []).flatMap(({ day, exercises }) =>
            exercises.map((exercise) => ({ ...exercise, day }))
          ),
        },
        updatedDays: (changes.day_overrides || []).map(({ day }) => day),
      };
    },
  },
  rateLimitService = {
    async consume() {
      return { allowed: true, limit: 100, remaining: 99, retryAfterSeconds: 60 };
    },
  },
} = {}) {
  const events = [];
  const tokenVerifier = {
    async verifyAccessToken(token) {
      if (token !== ACCESS_TOKEN) throw new InvalidTokenError("Invalid token");
      return {
        token,
        clientId: CLIENT_ID,
        scopes,
        expiresAt: Math.floor(Date.now() / 1000) + 300,
        resource: oauthConfig.resourceUrl,
        extra: {
          userId,
          roles: ["user"],
          grantId: "65f00a000000000000000002",
        },
      };
    },
  };
  const app = express();
  app.use(express.json());
  app.use(
    "/mcp",
    createMcpRouter({
      tokenVerifier,
      userService,
      splitService,
      rateLimitService,
      auditService: {
        async recordMcpAuditEvent(event) {
          events.push(event);
          return true;
        },
      },
    })
  );

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const endpoint = `http://127.0.0.1:${server.address().port}/mcp`;
  const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
    requestInit: { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } },
  });
  const client = new Client({ name: "mcp-integration-test", version: "1.0.0" });
  try {
    await client.connect(transport);
  } catch (error) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    throw error;
  }

  return {
    client,
    endpoint,
    events,
    server,
    async close() {
      await client.close();
      server.closeAllConnections();
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    },
  };
}

test("Streamable HTTP exposes authenticated tools and returns only the principal's data", async (t) => {
  let contextUserId;
  const mcp = await startServer({
    userService: {
      async getUserContext(userId, options) {
        contextUserId = userId;
        return {
          user: { id: userId },
          profile: { fitnessGoals: ["Strength"] },
          recentSessions: options.includeTrainingHistory ? [] : [],
        };
      },
    },
  });
  t.after(() => mcp.close());

  const { tools } = await mcp.client.listTools();
  assert.deepEqual(
    tools.map(({ name }) => name).sort(),
    [
      "get_current_workout_split",
      "get_user_context",
      "update_workout_split",
    ]
  );

  const contextResult = await mcp.client.callTool({
    name: "get_user_context",
    arguments: { userId: "attacker-selected-id" },
  });
  assert.equal(contextResult.isError, true);

  const validContextResult = await mcp.client.callTool({
    name: "get_user_context",
    arguments: {},
  });
  const context = JSON.parse(validContextResult.content[0].text);
  assert.equal(context.user.id, USER_ID);
  assert.equal(contextUserId, USER_ID);
  assert.deepEqual(context.profile.fitnessGoals, ["Strength"]);

  const splitResult = await mcp.client.callTool({
    name: "get_current_workout_split",
    arguments: {},
  });
  const split = JSON.parse(splitResult.content[0].text);
  assert.equal(split.split_id, "my-split");
  assert.equal(split.days.Mo[0].name, "Bench Press");
  assert.equal(split.days.Tu, null);
  assert.ok(
    mcp.events.some(
      (event) =>
        event.operation === "tool:get_user_context" &&
      event.principal.userId === USER_ID &&
      event.principal.clientId === CLIENT_ID
    )
  );
  assert.ok(
    mcp.events.some(
      (event) =>
      event.operation === "mcp:tools/call" &&
      event.toolName === "get_user_context" &&
      event.outcome === "error"
    )
  );
});

test("update_workout_split validates changes and records the client context", async (t) => {
  let receivedChanges;
  let receivedAuditContext;
  const mcp = await startServer({
    scopes: ["mcp:write:split"],
    splitService: {
      async getCurrentWorkoutSplit() {
        throw new Error("Not used");
      },
      async updateCurrentWorkoutSplit(_userId, changes, auditContext) {
        receivedChanges = changes;
        receivedAuditContext = auditContext;
        return {
          split: {
            split_id: "my-split",
            split_name: changes.split_name || "Test Split",
            description: "Test",
            creator: "Test User",
            exercises: changes.day_overrides.flatMap(({ day, exercises }) =>
              exercises.map((exercise) => ({ ...exercise, day }))
            ),
          },
          updatedDays: changes.day_overrides.map(({ day }) => day),
        };
      },
    },
  });
  t.after(() => mcp.close());

  const updateResult = await mcp.client.callTool({
    name: "update_workout_split",
    arguments: {
      day_overrides: [
        {
          day: "Mo",
          exercises: [
            {
              name: "Bench Press",
              sets: 4,
              reps: 8,
              youtube: "https://youtu.be/example",
            },
          ],
        },
      ],
    },
  });
  const update = JSON.parse(updateResult.content[0].text);
  assert.equal(update.success, true);
  assert.deepEqual(update.updated_days, ["Mo"]);
  assert.equal(receivedChanges.day_overrides[0].exercises[0].sets, 4);
  assert.deepEqual(receivedAuditContext, {
    clientId: CLIENT_ID,
    scopes: ["mcp:write:split"],
  });

  const acceptedChanges = structuredClone(receivedChanges);
  const invalidResult = await mcp.client.callTool({
    name: "update_workout_split",
    arguments: {
      day_overrides: [
        {
          day: "Mo",
          exercises: [
            {
              name: "Bench Press",
              sets: 21,
              reps: 8,
              creatorId: "attacker-controlled",
            },
          ],
        },
      ],
    },
  });
  assert.equal(invalidResult.isError, true);
  assert.deepEqual(receivedChanges, acceptedChanges);
});

test("each tool enforces its own read or write scope", async (t) => {
  let operationCalled = false;
  const mcp = await startServer({
    scopes: [],
    userService: {
      async getUserContext() {
        operationCalled = true;
      },
    },
    splitService: {
      async getCurrentWorkoutSplit() {
        operationCalled = true;
      },
      async updateCurrentWorkoutSplit() {
        operationCalled = true;
      },
    },
  });
  t.after(() => mcp.close());

  for (const [name, scope, args] of [
    ["get_user_context", "mcp:read:user", {}],
    ["get_current_workout_split", "mcp:read:split", {}],
    ["update_workout_split", "mcp:write:split", { split_name: "No grant" }],
  ]) {
    const response = await mcp.client.callTool({
      name,
      arguments: args,
    });
    assert.equal(response.isError, true);
    assert.deepEqual(JSON.parse(response.content[0].text), {
      error: "insufficient_scope",
      status: 403,
      required_scope: scope,
    });
  }
  assert.equal(operationCalled, false);
  assert.ok(mcp.events.some((event) => event.outcome === "denied"));
});

test("read and write calls use separate rate limits", async (t) => {
  const limitedKinds = [];
  const mcp = await startServer({
    rateLimitService: {
      async consume({ kind }) {
        limitedKinds.push(kind);
        return {
          allowed: kind !== "write",
          limit: kind === "write" ? 20 : 120,
          remaining: 0,
          retryAfterSeconds: 15,
        };
      },
    },
  });
  t.after(() => mcp.close());

  await mcp.client.callTool({
    name: "get_user_context",
    arguments: {},
  });
  await assert.rejects(
    mcp.client.callTool({
      name: "update_workout_split",
      arguments: { split_name: "Rate limited" },
    })
  );
  assert.deepEqual(limitedKinds, ["read", "write"]);

  const rateLimitAudit = mcp.events.find((event) => event.httpStatus === 429);
  assert.equal(rateLimitAudit.outcome, "denied");
  assert.equal(rateLimitAudit.principal.clientId, CLIENT_ID);
});

test("missing and invalid bearer tokens are rejected before MCP handling", async (t) => {
  const mcp = await startServer();
  t.after(() => mcp.close());

  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {},
  });
  const missingTokenResponse = await fetch(mcp.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  assert.equal(missingTokenResponse.status, 401);

  const invalidTokenResponse = await fetch(mcp.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer invalid-token",
    },
    body,
  });
  assert.equal(invalidTokenResponse.status, 401);
  assert.ok(
    mcp.events.some(
      (event) =>
        event.operation === "mcp:authentication" &&
        event.outcome === "denied"
    )
  );
});
