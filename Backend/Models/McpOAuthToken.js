const mongoose = require("mongoose");

const McpOAuthTokenSchema = new mongoose.Schema(
  {
    _id: { type: String },
    tokenType: { type: String, enum: ["access", "refresh"], required: true },
    jti: { type: String, sparse: true, unique: true },
    grantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "McpOAuthGrant",
      index: true,
    },
    clientId: { type: String, required: true, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    scopes: { type: [String], required: true },
    resource: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { versionKey: false, collection: "mcpoauthtokens" }
);

McpOAuthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("McpOAuthToken", McpOAuthTokenSchema);
