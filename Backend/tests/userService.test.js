const assert = require("node:assert/strict");
const test = require("node:test");
const User = require("../Models/User");
const { createUserService } = require("../Services/UserService");

test("user model persists gym membership fields and membership history", () => {
  const user = new User({
    name: "Test User",
    email: "test@example.com",
    gym: { id: "507f1f77bcf86cd799439011", name: "Iron House" },
    gymMembership: {
      gymId: "507f1f77bcf86cd799439011",
      gymName: "Iron House",
      membershipType: "Monthly",
      membershipStatus: "Active",
      membershipStartsAt: new Date("2026-09-01T00:00:00.000Z"),
    },
    gymMembershipHistory: [
      {
        gymId: "507f1f77bcf86cd799439012",
        gymName: "Old Gym",
        membershipType: "Quarterly",
        membershipStatus: "Revoked",
        revokedAt: new Date("2026-03-15T00:00:00.000Z"),
      },
    ],
  });

  assert.equal(user.validateSync(), undefined);
  assert.equal(user.gymMembership.membershipType, "Monthly");
  assert.equal(user.gymMembershipHistory[0].gymName, "Old Gym");
});

test("user context is an allowlisted response and limits history to seven sessions", async () => {
  const completedAt = new Date("2026-10-03T00:00:00.000Z");
  let sessionQuery;
  const userService = createUserService({
    userModel: {
      findById(userId) {
        assert.equal(userId, "user-123");
        return {
          async populate(field) {
            assert.deepEqual(field, [
              "profile",
              "gymMembership.gym",
              "gymMembership.gymId",
            ]);
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
              gym: { id: "gym-123", name: "Iron House" },
              gymMembership: {
                gymId: "gym-123",
                gymName: "Iron House",
                membershipType: "Monthly",
                membershipStatus: "Active",
                membershipStartsAt: new Date("2026-09-01T00:00:00.000Z"),
                membershipEndsAt: new Date("2026-10-01T00:00:00.000Z"),
                plan: "Legacy field should not leak",
              },
              gymMembershipHistory: [
                {
                  gymId: "old-gym",
                  gymName: "Old Gym",
                  membershipType: "Quarterly",
                  membershipStatus: "Revoked",
                  membershipStartsAt: new Date("2026-01-01T00:00:00.000Z"),
                  membershipEndsAt: new Date("2026-04-01T00:00:00.000Z"),
                  joinedAt: new Date("2026-01-01T00:00:00.000Z"),
                  revokedAt: new Date("2026-03-15T00:00:00.000Z"),
                  revokedReason: "Membership ended",
                  privateInternalField: "must not leak",
                },
                {
                  gym: {
                    _id: "legacy-gym",
                    name: "Legacy Gym",
                  },
                  plan: "Half-Yearly",
                  status: "Active",
                  startDate: new Date("2026-05-01T00:00:00.000Z"),
                  endDate: new Date("2026-11-01T00:00:00.000Z"),
                },
              ],
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
  assert.deepEqual(context.user.gym, { id: "gym-123", name: "Iron House" });
  assert.equal(context.user.gymMembership.membershipType, "Monthly");
  assert.equal(context.user.gymMembership.membershipStatus, "Active");
  assert.equal(context.user.gymMembership.plan, "Monthly");
  assert.equal(context.user.gymMembership.status, "Active");
  assert.equal(context.user.gymMembershipHistory[0].gymName, "Old Gym");
  assert.equal(context.user.gymMembershipHistory[0].revokedReason, "Membership ended");
  assert.equal(context.user.gymMembershipHistory[1].gymId, "legacy-gym");
  assert.equal(context.user.gymMembershipHistory[1].gymName, "Legacy Gym");
  assert.equal(context.user.gymMembershipHistory[1].plan, "Half-Yearly");
  assert.equal(context.user.gymMembershipHistory[1].status, "Active");
  assert.equal(
    context.user.gymMembershipHistory[1].membershipStartsAt.toISOString(),
    "2026-05-01T00:00:00.000Z"
  );
  assert.equal("privateInternalField" in context.user.gymMembership, false);
  assert.equal("privateInternalField" in context.user.gymMembershipHistory[0], false);
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
