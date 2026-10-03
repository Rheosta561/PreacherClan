const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, required: true, immutable: true },
    actor: {
      userId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
      role: { type: String, required: true, immutable: true },
      source: { type: String, required: true, enum: ["mcp"], immutable: true },
    },
    action: {
      type: String,
      required: true,
      enum: ["update_workout_split"],
      immutable: true,
    },
    splitId: { type: String, required: true, immutable: true },
    changes: {
      before: { type: mongoose.Schema.Types.Mixed, required: true, immutable: true },
      after: { type: mongoose.Schema.Types.Mixed, required: true, immutable: true },
    },
  },
  { versionKey: false, strict: "throw" }
);

module.exports = mongoose.model("AuditLog", AuditLogSchema);
