const assert = require("node:assert/strict");
const test = require("node:test");
const { createUserService } = require("../Services/UserService");

test("user context is an allowlisted response and limits history to seven sessions", async () => {
  const completedAt = new Date("2026-10-03T00:00:00.000Z");
  let sessionQuery;
  const userService = createUserService({
    userModel: {
      findById(userId) {
        assert.equal(userId, "user-123");
        return {
          async populate(field) {
            assert.equal(field, "profile");
            return {
              _id: { toString: () => "user-123" },
              name: "Test User",
              username: "test-user",
              email: "private@example.com",
              password: "hashed-password",
              age: 28,
              isTrainer: false,
              isVerified: true,
              streak: { count: 4, todayUpdated: true },
              preacherScore: 80,
              currentSplitId: "my-split",
              profile: {
                about: "Fitness enthusiast",
                fitnessGoals: ["Strength"],
                embedding: [0.1, 0.2],
              },
            };
          },
        };
      },
    },
    trainingSessionModel: {
      find(filter) {
        sessionQuery = { filter };
        return {
          sort(value) {
            sessionQuery.sort = value;
            return this;
          },
          limit(value) {
            sessionQuery.limit = value;
            return this;
          },
          select(value) {
            sessionQuery.select = value;
            return this;
          },
          async lean() {
            return [
              {
                splitId: "my-split",
                day: "Mo",
                status: "completed",
                completedAt,
                exerciseStats: [{ name: "Private detail" }],
              },
            ];
          },
        };
      },
    },
  });

  const context = await userService.getUserContext("user-123");
  assert.equal(context.user.id, "user-123");
  assert.equal(context.user.currentSplitId, "my-split");
  assert.equal(context.profile.about, "Fitness enthusiast");
  assert.equal(context.recentSessions[0].completedAt, completedAt.toISOString());
  assert.deepEqual(sessionQuery.filter.status, {
    $in: ["completed", "cancelled"],
  });
  assert.deepEqual(sessionQuery.sort, { completedAt: -1 });
  assert.equal(sessionQuery.limit, 7);
  assert.equal("email" in context.user, false);
  assert.equal("password" in context.user, false);
  assert.equal("embedding" in context.profile, false);
  assert.equal("exerciseStats" in context.recentSessions[0], false);
});
