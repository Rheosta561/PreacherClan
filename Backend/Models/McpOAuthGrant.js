const mongoose = require("mongoose");

const McpOAuthGrantSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    scopes: { type: [String], required: true },
    resource: { type: String, required: true },
    createdAt: { type: Date, required: true, default: Date.now },
    revokedAt: { type: Date, default: null },
  },
  { versionKey: false, collection: "mcpoauthgrants" }
);

module.exports = mongoose.model("McpOAuthGrant", McpOAuthGrantSchema);
