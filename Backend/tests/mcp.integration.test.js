const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const createMcpRouter = require("../Routes/mcpRoutes");

const AUTH_SECRET = "mcp-integration-test-secret";

async function startServer({
  scopes = [],
  userService = {
    async getUserContext(userId, options) {
      return {
        user: { id: userId },
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
} = {}) {
  const app = express();
  app.use(express.json());
  app.use(
    "/mcp",
    createMcpRouter({
      authSecret: AUTH_SECRET,
      userService,
      splitService,
    })
  );

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const token = jwt.sign(
    { sub: "user-123", role: "user", type: "access", scope: scopes },
    AUTH_SECRET,
    { expiresIn: "5m" }
  );
  const transport = new StreamableHTTPClientTransport(
    new URL(`http://127.0.0.1:${address.port}/mcp`),
    { requestInit: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const client = new Client({ name: "mcp-integration-test", version: "1.0.0" });
  await client.connect(transport);

  return {
    client,
    server,
    async close() {
      await client.close();
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    },
  };
}

test("Streamable HTTP advertises and executes the three authenticated tools", async (t) => {
  const mcp = await startServer();
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
    arguments: {},
  });
  const context = JSON.parse(contextResult.content[0].text);
  assert.equal(context.user.id, "user-123");
  assert.deepEqual(context.profile.fitnessGoals, ["Strength"]);

  const splitResult = await mcp.client.callTool({
    name: "get_current_workout_split",
    arguments: {},
  });
  const split = JSON.parse(splitResult.content[0].text);
  assert.equal(split.split_id, "my-split");
  assert.equal(split.days.Mo[0].name, "Bench Press");
  assert.equal(split.days.Tu, null);
});

test("update_workout_split validates replacements and returns the updated split", async (t) => {
  let receivedChanges;
  const mcp = await startServer({
    scopes: ["mcp:write:split"],
    splitService: {
      async getCurrentWorkoutSplit() {
        throw new Error("Not used");
      },
      async updateCurrentWorkoutSplit(_userId, changes) {
        receivedChanges = changes;
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

test("update_workout_split requires its explicit token scope", async (t) => {
  let updateCalled = false;
  const mcp = await startServer({
    splitService: {
      async getCurrentWorkoutSplit() {
        throw new Error("Not used");
      },
      async updateCurrentWorkoutSplit() {
        updateCalled = true;
      },
    },
  });
  t.after(() => mcp.close());

  const response = await mcp.client.callTool({
    name: "update_workout_split",
    arguments: { split_name: "No grant" },
  });
  assert.equal(response.isError, true);
  assert.deepEqual(JSON.parse(response.content[0].text), {
    error: "Missing mcp:write:split permission",
    status: 403,
  });
  assert.equal(updateCalled, false);
});

test("MCP rejects missing and non-user access tokens before protocol handling", async (t) => {
  const app = express();
  app.use(express.json());
  app.use("/mcp", createMcpRouter({ authSecret: AUTH_SECRET }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      )
  );
  const endpoint = `http://127.0.0.1:${server.address().port}/mcp`;

  const missingTokenResponse = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
  });
  assert.equal(missingTokenResponse.status, 401);

  const gymToken = jwt.sign(
    { sub: "gym-123", role: "gym", type: "access" },
    AUTH_SECRET,
    { expiresIn: "5m" }
  );
  const gymTokenResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${gymToken}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
  });
  assert.equal(gymTokenResponse.status, 401);
});
