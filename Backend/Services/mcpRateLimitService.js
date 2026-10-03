const { createHash } = require("node:crypto");
const McpRateLimitBucket = require("../Models/McpRateLimitBucket");

const parseLimit = (value, fallback, name) => {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
};

const limits = {
  read: parseLimit(
    process.env.MCP_READ_RATE_LIMIT_PER_MINUTE,
    120,
    "MCP_READ_RATE_LIMIT_PER_MINUTE"
  ),
  write: parseLimit(
    process.env.MCP_WRITE_RATE_LIMIT_PER_MINUTE,
    20,
    "MCP_WRITE_RATE_LIMIT_PER_MINUTE"
  ),
};

const createMcpRateLimitService = ({
  bucketModel = McpRateLimitBucket,
  now = () => Date.now(),
} = {}) => ({
  async consume({ principal, kind }) {
    const windowMs = 60 * 1000;
    const timestamp = now();
    const windowNumber = Math.floor(timestamp / windowMs);
    const nextWindowAt = (windowNumber + 1) * windowMs;
    const key = createHash("sha256")
      .update(
        `${principal.userId}:${principal.clientId}:${kind}:${windowNumber}`
      )
      .digest("hex");
    let bucket;
    try {
      bucket = await bucketModel.findOneAndUpdate(
        { _id: key },
        {
          $inc: { count: 1 },
          $setOnInsert: { expiresAt: new Date(nextWindowAt) },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (error) {
      if (error.code !== 11000) throw error;
      bucket = await bucketModel.findOneAndUpdate(
        { _id: key },
        { $inc: { count: 1 } },
        { new: true }
      );
      if (!bucket) throw error;
    }
    const remaining = Math.max(0, limits[kind] - bucket.count);

    return {
      allowed: bucket.count <= limits[kind],
      limit: limits[kind],
      remaining,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((nextWindowAt - timestamp) / 1000)
      ),
    };
  },
});

module.exports = {
  ...createMcpRateLimitService(),
  createMcpRateLimitService,
  limits,
};
