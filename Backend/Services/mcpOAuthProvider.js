const { createHash, randomBytes, randomUUID } = require("node:crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const {
  InvalidGrantError,
  InvalidRequestError,
} = require("@modelcontextprotocol/sdk/server/auth/errors.js");
const McpOAuthClient = require("../Models/McpOAuthClient");
const McpOAuthAuthorizationRequest = require("../Models/McpOAuthAuthorizationRequest");
const McpOAuthAuthorizationCode = require("../Models/McpOAuthAuthorizationCode");
const McpOAuthGrant = require("../Models/McpOAuthGrant");
const McpOAuthToken = require("../Models/McpOAuthToken");
const config = require("../config/mcpOAuth");

const hash = (value) =>
  createHash("sha256").update(value).digest("hex");

const normalizeResource = (resource) => {
  const url = new URL(resource);
  url.hash = "";
  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }
  return url.href;
};

const resourceMatches = (value) =>
  normalizeResource(value) === normalizeResource(config.resourceUrl.href);

const makeAuthorizationCode = () => randomBytes(32).toString("base64url");
const makeOpaqueToken = () => randomBytes(48).toString("base64url");

class McpOAuthProvider {
  constructor({
    clientModel = McpOAuthClient,
    requestModel = McpOAuthAuthorizationRequest,
    codeModel = McpOAuthAuthorizationCode,
    grantModel = McpOAuthGrant,
    tokenModel = McpOAuthToken,
    now = () => new Date(),
  } = {}) {
    this.clientModel = clientModel;
    this.requestModel = requestModel;
    this.codeModel = codeModel;
    this.grantModel = grantModel;
    this.tokenModel = tokenModel;
    this.now = now;
    this.clientsStore = {
      getClient: (clientId) => this.getClient(clientId),
      registerClient: (client) => this.registerClient(client),
    };
  }

  async getClient(clientId) {
    const record = await this.clientModel.findOne({ clientId }).lean();
    return record?.metadata;
  }

  async registerClient(client) {
    if (client.token_endpoint_auth_method !== "none") {
      throw new InvalidRequestError(
        "Only public OAuth clients using PKCE are supported"
      );
    }
    if (client.client_secret) {
      throw new InvalidRequestError("Public OAuth clients must not have a secret");
    }

    await this.clientModel.create({
      clientId: client.client_id,
      metadata: client,
      createdAt: this.now(),
    });
    return client;
  }

  async authorize(client, params, res) {
    const requestedScopes = params.scopes || [];
    if (new Set(requestedScopes).size !== requestedScopes.length) {
      throw new InvalidRequestError("Duplicate scopes are not supported");
    }
    const scopes = requestedScopes.length ? requestedScopes : config.defaultScopes;
    if (scopes.some((scope) => !config.scopes.includes(scope))) {
      throw new InvalidRequestError("One or more requested scopes are unsupported");
    }
    const resource = params.resource?.href || config.resourceUrl.href;
    if (!resourceMatches(resource)) {
      throw new InvalidRequestError("The requested resource is not this MCP server");
    }
    if (!client.redirect_uris?.length) {
      throw new InvalidRequestError("The OAuth client has no registered redirect URI");
    }

    const transactionId = randomBytes(32).toString("base64url");
    const expiresAt = new Date(
      this.now().getTime() + config.authorizationRequestTtlSeconds * 1000
    );
    await this.requestModel.create({
      _id: hash(transactionId),
      clientId: client.client_id,
      clientName: client.client_name || client.client_id,
      redirectUri: params.redirectUri,
      state: params.state,
      codeChallenge: params.codeChallenge,
      resource: normalizeResource(resource),
      scopes,
      expiresAt,
      createdAt: this.now(),
    });

    const consentUrl = new URL(config.consentUrl);
    consentUrl.searchParams.set("transaction", transactionId);
    res.redirect(consentUrl.href);
  }

  async getAuthorizationRequest(transactionId) {
    const record = await this.requestModel
      .findOne({ _id: hash(transactionId), expiresAt: { $gt: this.now() } })
      .lean();
    if (!record) {
      throw new InvalidGrantError("Authorization request expired or not found");
    }

    return {
      clientId: record.clientId,
      clientName: record.clientName,
      redirectHost: new URL(record.redirectUri).host,
      scopes: record.scopes,
      expiresAt: record.expiresAt,
    };
  }

  async approveAuthorization(transactionId, userId, approvedScopes) {
    const requestId = hash(transactionId);
    const pending = await this.requestModel
      .findOne({ _id: requestId, expiresAt: { $gt: this.now() } })
      .lean();
    if (!pending) {
      throw new InvalidGrantError("Authorization request expired or not found");
    }

    if (
      !Array.isArray(approvedScopes) ||
      approvedScopes.some(
        (scope) =>
          !pending.scopes.includes(scope) ||
          !config.scopes.includes(scope)
      ) ||
      new Set(approvedScopes).size !== approvedScopes.length
    ) {
      throw new InvalidRequestError("Approved scopes must be selected from the request");
    }

    const claimed = await this.requestModel.findOneAndDelete({
      _id: requestId,
      expiresAt: { $gt: this.now() },
    });
    if (!claimed) {
      throw new InvalidGrantError("Authorization request has already been used");
    }

    const code = makeAuthorizationCode();
    await this.codeModel.create({
      _id: hash(code),
      clientId: claimed.clientId,
      userId,
      redirectUri: claimed.redirectUri,
      codeChallenge: claimed.codeChallenge,
      resource: claimed.resource,
      scopes: approvedScopes,
      expiresAt: new Date(
        this.now().getTime() + config.authorizationCodeTtlSeconds * 1000
      ),
      createdAt: this.now(),
    });

    return this.buildRedirect(claimed, { code });
  }

  async denyAuthorization(transactionId) {
    const claimed = await this.requestModel.findOneAndDelete({
      _id: hash(transactionId),
      expiresAt: { $gt: this.now() },
    });
    if (!claimed) {
      throw new InvalidGrantError("Authorization request expired or not found");
    }

    return this.buildRedirect(claimed, { error: "access_denied" });
  }

  buildRedirect(request, response) {
    const redirect = new URL(request.redirectUri);
    if (response.code) redirect.searchParams.set("code", response.code);
    if (response.error) redirect.searchParams.set("error", response.error);
    if (request.state !== undefined) {
      redirect.searchParams.set("state", request.state);
    }
    return redirect.href;
  }

  async challengeForAuthorizationCode(client, authorizationCode) {
    const record = await this.codeModel
      .findOne({
        _id: hash(authorizationCode),
        clientId: client.client_id,
        expiresAt: { $gt: this.now() },
      })
      .lean();
    if (!record) {
      throw new InvalidGrantError("Authorization code is invalid or expired");
    }
    return record.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client,
    authorizationCode,
    _codeVerifier,
    redirectUri,
    resource
  ) {
    const codeHash = hash(authorizationCode);
    const pending = await this.codeModel
      .findOne({
        _id: codeHash,
        clientId: client.client_id,
        expiresAt: { $gt: this.now() },
      })
      .lean();
    if (
      !pending ||
      !redirectUri ||
      redirectUri !== pending.redirectUri ||
      (resource && !resourceMatches(resource.href)) ||
      !resourceMatches(pending.resource)
    ) {
      throw new InvalidGrantError("Authorization code is invalid or expired");
    }

    const consumed = await this.codeModel.findOneAndDelete({
      _id: codeHash,
      clientId: client.client_id,
      redirectUri,
      expiresAt: { $gt: this.now() },
    });
    if (!consumed) {
      throw new InvalidGrantError("Authorization code has already been used");
    }

    const grant = await this.grantModel.create({
      clientId: consumed.clientId,
      userId: consumed.userId,
      scopes: consumed.scopes,
      resource: consumed.resource,
      createdAt: this.now(),
      revokedAt: null,
    });

    return this.issueTokenPair(grant);
  }

  async exchangeRefreshToken(client, refreshToken, scopes, resource) {
    const tokenHash = hash(refreshToken);
    const tokenRecord = await this.tokenModel
      .findOne({
        _id: tokenHash,
        tokenType: "refresh",
        clientId: client.client_id,
      })
      .lean();
    if (!tokenRecord) {
      throw new InvalidGrantError("Refresh token is invalid, expired, or revoked");
    }
    if (tokenRecord.expiresAt <= this.now()) {
      throw new InvalidGrantError("Refresh token is invalid, expired, or revoked");
    }
    if (tokenRecord.revokedAt) {
      const now = this.now();
      await this.grantModel.updateOne(
        { _id: tokenRecord.grantId, clientId: client.client_id, revokedAt: null },
        { $set: { revokedAt: now } }
      );
      await this.tokenModel.updateMany(
        { grantId: tokenRecord.grantId, revokedAt: null },
        { $set: { revokedAt: now } }
      );
      throw new InvalidGrantError("Refresh token reuse revoked this grant");
    }

    const grant = await this.grantModel.findOne({
      _id: tokenRecord.grantId,
      clientId: client.client_id,
      revokedAt: null,
    });
    if (
      !grant ||
      (resource && !resourceMatches(resource.href)) ||
      !resourceMatches(tokenRecord.resource)
    ) {
      throw new InvalidGrantError("Refresh token is invalid, expired, or revoked");
    }

    const nextScopes = scopes || tokenRecord.scopes;
    if (
      !Array.isArray(nextScopes) ||
      new Set(nextScopes).size !== nextScopes.length ||
      nextScopes.some((scope) => !tokenRecord.scopes.includes(scope))
    ) {
      throw new InvalidGrantError("A refresh token cannot increase its granted scopes");
    }

    const revoked = await this.tokenModel.updateOne(
      { _id: tokenHash, revokedAt: null, expiresAt: { $gt: this.now() } },
      { $set: { revokedAt: this.now() } }
    );
    if (revoked.modifiedCount !== 1) {
      throw new InvalidGrantError("Refresh token has already been used");
    }

    return this.issueTokenPair(grant, nextScopes);
  }

  async issueTokenPair(grant, scopes = grant.scopes) {
    const now = this.now();
    const accessExpiresAt = new Date(
      now.getTime() + config.accessTokenTtlSeconds * 1000
    );
    const refreshExpiresAt = new Date(
      now.getTime() + config.refreshTokenTtlSeconds * 1000
    );
    const jti = randomUUID();
    const accessToken = jwt.sign(
      {
        sub: grant.userId.toString(),
        client_id: grant.clientId,
        role: "user",
        type: "mcp_access",
        scope: scopes.join(" "),
        jti,
      },
      config.accessTokenSecret,
      {
        algorithm: "HS256",
        issuer: config.issuerUrl.href,
        audience: grant.resource,
        expiresIn: config.accessTokenTtlSeconds,
        notBefore: 0,
      }
    );
    const refreshToken = makeOpaqueToken();

    await this.tokenModel.insertMany([
      {
        _id: hash(accessToken),
        tokenType: "access",
        jti,
        grantId: grant._id,
        clientId: grant.clientId,
        userId: grant.userId,
        scopes,
        resource: grant.resource,
        expiresAt: accessExpiresAt,
        revokedAt: null,
        createdAt: now,
      },
      {
        _id: hash(refreshToken),
        tokenType: "refresh",
        grantId: grant._id,
        clientId: grant.clientId,
        userId: grant.userId,
        scopes,
        resource: grant.resource,
        expiresAt: refreshExpiresAt,
        revokedAt: null,
        createdAt: now,
      },
    ]);

    return {
      access_token: accessToken,
      token_type: "bearer",
      expires_in: config.accessTokenTtlSeconds,
      refresh_token: refreshToken,
      scope: scopes.join(" "),
    };
  }

  async issueDevelopmentToken(userId, clientId, scopes) {
    const grant = await this.grantModel.create({
      clientId,
      userId,
      scopes,
      resource: normalizeResource(config.resourceUrl.href),
      createdAt: this.now(),
      revokedAt: null,
    });
    const pair = await this.issueTokenPair(grant, scopes);
    await this.tokenModel.updateOne(
      { grantId: grant._id, tokenType: "refresh", revokedAt: null },
      { $set: { revokedAt: this.now() } }
    );
    delete pair.refresh_token;
    return pair;
  }

  async verifyAccessToken(token) {
    const claims = jwt.verify(token, config.accessTokenSecret, {
      algorithms: ["HS256"],
      issuer: config.issuerUrl.href,
      audience: config.resourceUrl.href,
    });
    if (
      typeof claims !== "object" ||
      !claims ||
      claims.type !== "mcp_access" ||
      typeof claims.sub !== "string" ||
      !mongoose.Types.ObjectId.isValid(claims.sub) ||
      typeof claims.client_id !== "string" ||
      typeof claims.jti !== "string" ||
      typeof claims.scope !== "string"
    ) {
      throw new Error("Invalid access token");
    }

    const tokenRecord = await this.tokenModel
      .findOne({
        _id: hash(token),
        tokenType: "access",
        jti: claims.jti,
        revokedAt: null,
        expiresAt: { $gt: this.now() },
      })
      .lean();
    if (
      !tokenRecord ||
      tokenRecord.clientId !== claims.client_id ||
      tokenRecord.userId.toString() !== claims.sub
    ) {
      throw new Error("Invalid access token");
    }

    const grant = await this.grantModel
      .findOne({
        _id: tokenRecord.grantId,
        clientId: tokenRecord.clientId,
        userId: tokenRecord.userId,
        revokedAt: null,
      })
      .lean();
    if (!grant) {
      throw new Error("Revoked access token");
    }

    const scopes = claims.scope ? claims.scope.split(" ") : [];
    if (
      scopes.length !== tokenRecord.scopes.length ||
      scopes.some((scope) => !tokenRecord.scopes.includes(scope)) ||
      !resourceMatches(tokenRecord.resource)
    ) {
      throw new Error("Invalid access token");
    }

    return {
      token,
      clientId: tokenRecord.clientId,
      scopes,
      expiresAt: claims.exp,
      resource: new URL(tokenRecord.resource),
      extra: {
        userId: tokenRecord.userId.toString(),
        roles: ["user"],
        grantId: tokenRecord.grantId.toString(),
      },
    };
  }

  async revokeToken(client, request) {
    const tokenHash = hash(request.token);
    const token = await this.tokenModel.findOne({
      _id: tokenHash,
      clientId: client.client_id,
      revokedAt: null,
    });
    if (!token) return;

    const now = this.now();
    await this.tokenModel.updateOne(
      { _id: tokenHash, revokedAt: null },
      { $set: { revokedAt: now } }
    );
    if (token.tokenType === "refresh") {
      await this.grantModel.updateOne(
        { _id: token.grantId, clientId: client.client_id, revokedAt: null },
        { $set: { revokedAt: now } }
      );
      await this.tokenModel.updateMany(
        { grantId: token.grantId, revokedAt: null },
        { $set: { revokedAt: now } }
      );
    }
  }
}

module.exports = { McpOAuthProvider, normalizeResource, hash };
