const assert = require("node:assert/strict");
const { createHash, randomBytes } = require("node:crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const test = require("node:test");
const { McpOAuthProvider } = require("../Services/mcpOAuthProvider");
const oauthConfig = require("../config/mcpOAuth");

const digest = (value) =>
  createHash("sha256").update(value).digest("base64url");

const matches = (record, filter) =>
  Object.entries(filter).every(([key, expected]) => {
    if (expected && typeof expected === "object" && "$gt" in expected) {
      return record[key] > expected.$gt;
    }
    return String(record[key]) === String(expected);
  });

function createMemoryModel() {
  const records = [];
  return {
    records,
    async create(value) {
      const record = { ...value };
      if (!record._id) record._id = new mongoose.Types.ObjectId();
      records.push(record);
      return record;
    },
    findOne(filter) {
      const record = records.find((candidate) => matches(candidate, filter)) || null;
      return {
        lean: async () => record,
        then: (resolve, reject) => Promise.resolve(record).then(resolve, reject),
      };
    },
    async findOneAndDelete(filter) {
      const index = records.findIndex((record) => matches(record, filter));
      if (index < 0) return null;
      return records.splice(index, 1)[0];
    },
    async updateOne(filter, update) {
      const record = records.find((candidate) => matches(candidate, filter));
      if (!record) return { modifiedCount: 0 };
      Object.assign(record, update.$set);
      return { modifiedCount: 1 };
    },
    async updateMany(filter, update) {
      const matching = records.filter((candidate) => matches(candidate, filter));
      matching.forEach((record) => Object.assign(record, update.$set));
      return { modifiedCount: matching.length };
    },
    async insertMany(values) {
      const inserted = values.map((value) => ({ ...value }));
      records.push(...inserted);
      return inserted;
    },
  };
}

function createProvider() {
  const models = {
    clientModel: createMemoryModel(),
    requestModel: createMemoryModel(),
    codeModel: createMemoryModel(),
    grantModel: createMemoryModel(),
    tokenModel: createMemoryModel(),
  };
  return { provider: new McpOAuthProvider(models), models };
}

async function authorizeClient(provider, client) {
  const verifier = randomBytes(32).toString("base64url");
  let consentUrl;
  await provider.authorize(
    client,
    {
      scopes: ["mcp:read:user", "mcp:read:split"],
      resource: oauthConfig.resourceUrl,
      redirectUri: client.redirect_uris[0],
      state: "state-from-agent",
      codeChallenge: digest(verifier),
    },
    { redirect(value) {
      consentUrl = value;
    } }
  );
  const transactionId = new URL(consentUrl).searchParams.get("transaction");
  const authorizationRequest =
    await provider.getAuthorizationRequest(transactionId);
  const redirectUrl = await provider.approveAuthorization(
    transactionId,
    "65f00a000000000000000001",
    ["mcp:read:user", "mcp:read:split"]
  );
  return {
    verifier,
    authorizationRequest,
    redirectUrl: new URL(redirectUrl),
    transactionId,
  };
}

const testClient = () => ({
  client_id: "test-agent",
  client_name: "Test Agent",
  token_endpoint_auth_method: "none",
  redirect_uris: ["https://agent.example/callback"],
});

test("authorization code exchange issues a client-bound access token and rotates refresh tokens", async () => {
  const { provider, models } = createProvider();
  const client = testClient();
  await provider.registerClient(client);
  const {
    verifier,
    authorizationRequest,
    redirectUrl,
    transactionId,
  } = await authorizeClient(
    provider,
    client
  );
  assert.equal(authorizationRequest.redirectHost, "agent.example");
  assert.equal(redirectUrl.searchParams.get("state"), "state-from-agent");
  assert.ok(await provider.getAuthorizationRequest(transactionId).catch(() => null) === null);
  const code = redirectUrl.searchParams.get("code");
  assert.equal(
    await provider.challengeForAuthorizationCode(client, code),
    digest(verifier)
  );

  const pair = await provider.exchangeAuthorizationCode(
    client,
    code,
    undefined,
    client.redirect_uris[0],
    oauthConfig.resourceUrl
  );
  const principal = await provider.verifyAccessToken(pair.access_token);
  assert.equal(principal.clientId, client.client_id);
  assert.equal(principal.extra.userId, "65f00a000000000000000001");
  assert.deepEqual(principal.scopes, ["mcp:read:user", "mcp:read:split"]);
  await assert.rejects(
    provider.verifyAccessToken(`${pair.access_token}tampered`)
  );
  const expiredToken = jwt.sign(
    {
      sub: "65f00a000000000000000001",
      client_id: client.client_id,
      type: "mcp_access",
      scope: "mcp:read:user",
      jti: "expired-token-id",
    },
    oauthConfig.accessTokenSecret,
    {
      algorithm: "HS256",
      issuer: oauthConfig.issuerUrl.href,
      audience: oauthConfig.resourceUrl.href,
      expiresIn: -1,
    }
  );
  await assert.rejects(provider.verifyAccessToken(expiredToken));

  const rotatedPair = await provider.exchangeRefreshToken(
    client,
    pair.refresh_token,
    undefined,
    oauthConfig.resourceUrl
  );
  assert.notEqual(rotatedPair.refresh_token, pair.refresh_token);
  await assert.rejects(
    provider.exchangeRefreshToken(
      client,
      pair.refresh_token,
      undefined,
      oauthConfig.resourceUrl
    ),
    /reuse revoked this grant/
  );
  await assert.rejects(provider.verifyAccessToken(rotatedPair.access_token));
  assert.equal(models.grantModel.records[0].revokedAt instanceof Date, true);
});

test("revoke of a refresh token invalidates the grant's access token", async () => {
  const { provider } = createProvider();
  const client = testClient();
  await provider.registerClient(client);
  const { verifier, redirectUrl } = await authorizeClient(provider, client);
  const code = redirectUrl.searchParams.get("code");
  assert.ok(verifier);
  const pair = await provider.exchangeAuthorizationCode(
    client,
    code,
    undefined,
    client.redirect_uris[0],
    oauthConfig.resourceUrl
  );

  await provider.revokeToken(client, { token: pair.refresh_token });
  await assert.rejects(provider.verifyAccessToken(pair.access_token));
});

test("authorization rejects unsupported or duplicate scopes and non-public clients", async () => {
  const { provider } = createProvider();
  const client = testClient();
  await assert.rejects(
    provider.registerClient({ ...client, token_endpoint_auth_method: "client_secret_post" }),
    /Only public OAuth clients/
  );

  for (const scopes of [
    ["mcp:read:user", "mcp:read:user"],
    ["admin:everything"],
  ]) {
    await assert.rejects(
      provider.authorize(
        client,
        {
          scopes,
          resource: oauthConfig.resourceUrl,
          redirectUri: client.redirect_uris[0],
          codeChallenge: digest("verifier"),
        },
        { redirect() {} }
      )
    );
  }
});
