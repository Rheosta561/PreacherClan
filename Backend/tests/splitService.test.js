const assert = require("node:assert/strict");
const test = require("node:test");
const { createSplitService } = require("../Services/SplitService");

function makeService({
  creatorId = "user-123",
  isAdmin = false,
  currentSplitId = "my-split",
  updateResult,
  createSplitId = () => "personal-split",
} = {}) {
  const calls = { update: null, audit: null, created: null, userUpdate: null };
  let split = {
    _id: "split-document-id",
    __v: 4,
    split_id: "my-split",
    split_name: "Old name",
    description: "Old description",
    creator: "Test User",
    creatorId,
    exercises: [
      { day: "Mo", name: "Old exercise", sets: 3, reps: 8 },
      { day: "Tu", name: "Keep this day", sets: 2, reps: 10 },
    ],
  };
  const service = createSplitService({
    getUserForSplitAccess: async () => ({
      currentSplitId,
      name: "Test User",
      isAdmin,
    }),
    workoutSplitModel: {
      async findOne() {
        return split;
      },
      async create(data) {
        calls.created = data;
        split = {
          ...data,
          _id: "personal-split-document-id",
          __v: 0,
        };
        return split;
      },
      async findOneAndUpdate(filter, update, options) {
        calls.update = { filter, update, options };
        if (updateResult === null) return null;
        return {
          ...split,
          ...update.$set,
          __v: split.__v + 1,
        };
      },
      async deleteOne() {},
    },
    userModel: {
      async findOneAndUpdate(filter, update) {
        calls.userUpdate = { filter, update };
        return { _id: filter._id };
      },
    },
    auditLogModel: {
      async create(entry) {
        calls.audit = entry;
      },
    },
    createSplitId,
  });
  return { service, calls };
}

test("updates only the authenticated owner's current split and records the change", async () => {
  const { service, calls } = makeService();
  const { split, updatedDays } = await service.updateCurrentWorkoutSplit("user-123", {
    split_name: "New name",
    day_overrides: [
      {
        day: "Mo",
        exercises: [{ name: "New exercise", sets: 4, reps: 6 }],
      },
    ],
  });

  assert.equal(split.split_name, "New name");
  assert.deepEqual(updatedDays, ["Mo"]);
  assert.deepEqual(calls.update.filter, {
    _id: "split-document-id",
    __v: 4,
  });
  assert.deepEqual(calls.update.update.$set.exercises, [
    { day: "Tu", name: "Keep this day", sets: 2, reps: 10 },
    { name: "New exercise", sets: 4, reps: 6, day: "Mo" },
  ]);
  assert.equal(calls.audit.actor.userId, "user-123");
  assert.equal(calls.audit.actor.source, "mcp");
  assert.equal(calls.audit.action, "update_workout_split");
  assert.equal(calls.audit.changes.before.exercises[0].name, "Old exercise");
  assert.equal(calls.audit.changes.after.exercises[0].name, "Keep this day");
});

test("copies a shared split before updating it for the authenticated user", async () => {
  const { service, calls } = makeService({ creatorId: "another-user" });

  const result = await service.updateCurrentWorkoutSplit("user-123", {
    split_name: "My Custom Split",
  });

  assert.equal(calls.created.split_id, "personal-split");
  assert.equal(calls.created.creatorId, "user-123");
  assert.equal(calls.created.creator, "Test User");
  assert.equal(calls.created.split_name, "Old name");
  assert.deepEqual(calls.userUpdate, {
    filter: { _id: "user-123", currentSplitId: "my-split" },
    update: { $set: { currentSplitId: "personal-split" } },
  });
  assert.equal(calls.update.filter._id, "personal-split-document-id");
  assert.equal(result.split.split_id, "personal-split");
  assert.equal(result.copiedFromSplitId, "my-split");
  assert.equal(calls.audit.splitId, "personal-split");
});

test("returns a conflict and does not audit when optimistic concurrency fails", async () => {
  const { service, calls } = makeService({ updateResult: null });

  await assert.rejects(
    service.updateCurrentWorkoutSplit("user-123", { split_name: "Retry me" }),
    { statusCode: 409 }
  );
  assert.equal(calls.update.filter.__v, 4);
  assert.equal(calls.audit, null);
});
