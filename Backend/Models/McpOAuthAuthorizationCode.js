const mongoose = require("mongoose");

const McpOAuthAuthorizationCodeSchema = new mongoose.Schema(
  {
    _id: { type: String },
    clientId: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    redirectUri: { type: String, required: true },
    codeChallenge: { type: String, required: true },
    resource: { type: String, required: true },
    scopes: { type: [String], required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { versionKey: false, collection: "mcpoauthauthorizationcodes" }
);

McpOAuthAuthorizationCodeSchema.index(
  { expiresAt:  1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model(
  "McpOAuthAuthorizationCode",
  McpOAuthAuthorizationCodeSchema
);
