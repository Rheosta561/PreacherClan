const mongoose = require("mongoose");

const McpRateLimitBucketSchema = new mongoose.Schema(
  {
    _id: { type: String },
    count: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false, collection: "mcpratelimitbuckets" }
);

McpRateLimitBucketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("McpRateLimitBucket", McpRateLimitBucketSchema);
