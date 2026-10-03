const mongoose = require("mongoose");

const McpAuditEventSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, required: true, immutable: true, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      immutable: true,
      index: true,
    },
    clientId: { type: String, required: true, immutable: true, index: true },
    scopes: { type: [String], required: true, immutable: true },
    operation: { type: String, required: true, immutable: true },
    toolName: { type: String, immutable: true },
    outcome: {
      type: String,
      enum: ["success", "denied", "error"],
      required: true,
      immutable: true,
    },
    httpStatus: { type: Number, required: true, immutable: true },
    durationMs: { type: Number, required: true, immutable: true },
    requestId: { type: String, immutable: true },
  },
  { versionKey: false, strict: "throw", collection: "mcpauditevents" }
);

module.exports = mongoose.model("McpAuditEvent", McpAuditEventSchema);
