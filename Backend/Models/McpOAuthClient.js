const mongoose = require("mongoose");

const McpOAuthClientSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true, unique: true },
    metadata: { type: mongoose.Schema.Types.Mixed, required: true },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { versionKey: false }
);

module.exports = mongoose.model("McpOAuthClient", McpOAuthClientSchema);
