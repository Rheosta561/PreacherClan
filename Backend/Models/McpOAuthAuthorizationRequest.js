const mongoose = require("mongoose");

const McpOAuthAuthorizationRequestSchema = new mongoose.Schema(
  {
    _id: { type: String },
    clientId: { type: String, required: true },
    clientName: { type: String, required: true },
    redirectUri: { type: String, required: true },
    state: { type: String },
    codeChallenge: { type: String, required: true },
    resource: { type: String, required: true },
    scopes: { type: [String], required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { versionKey: false, collection: "mcpoauthauthorizationrequests" }
);

McpOAuthAuthorizationRequestSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model(
  "McpOAuthAuthorizationRequest",
  McpOAuthAuthorizationRequestSchema
);
