const assert = require("node:assert/strict");
const test = require("node:test");
const {
  createMcpRateLimitService,
  limits,
} = require("../Services/mcpRateLimitService");

test("read/write limits are independent per OAuth user and client", async () => {
  const buckets = new Map();
  const bucketModel = {
    async findOneAndUpdate(filter, update) {
      let bucket = buckets.get(filter._id);
      if (!bucket) {
        bucket = { _id: filter._id, count: 0, ...update.$setOnInsert };
        buckets.set(filter._id, bucket);
      }
      bucket.count += update.$inc.count;
      return { ...bucket };
    },
  };
  const service = createMcpRateLimitService({
    bucketModel,
    now: () => 60_000,
  });
  const principal = {
    userId: "65f00a000000000000000001",
    clientId: "agent-one",
  };

  let response;
  for (let count = 0; count < limits.read; count += 1) {
    response = await service.consume({ principal, kind: "read" });
  }
  assert.equal(response.allowed, true);
  assert.equal(response.remaining, 0);
  const overLimit = await service.consume({ principal, kind: "read" });
  assert.equal(overLimit.allowed, false);
  assert.equal(overLimit.retryAfterSeconds, 60);

  assert.equal(
    (await service.consume({ principal, kind: "write" })).allowed,
    true
  );
  assert.equal(
    (
      await service.consume({
        principal: { ...principal, clientId: "agent-two" },
        kind: "read",
      })
    ).allowed,
    true
  );
  assert.ok([...buckets.keys()].every((key) => /^[a-f0-9]{64}$/.test(key)));
});
