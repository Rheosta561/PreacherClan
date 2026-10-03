const UserService = require("./UserService");
const WorkoutSplit = require("../Models/WorkoutSplit");
const User = require("../Models/User");
const AuditLog = require("../Models/AuditLog");
const { generateSplitId } = require("../Utils/generateSplitId");

const DAY_CODES = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function createServiceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toSnapshot(split) {
  return {
    split_name: split.split_name,
    description: split.description,
    exercises: split.exercises.map((exercise) => ({
      day: exercise.day,
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      difficulty: exercise.difficulty,
      target_muscles: exercise.target_muscles,
      equipment: exercise.equipment,
      youtube: exercise.youtube,
      description: exercise.description,
      instructions: exercise.instructions,
    })),
  };
}

function createSplitService({
  getUserForSplitAccess = UserService.getUserForSplitAccess,
  workoutSplitModel = WorkoutSplit,
  userModel = User,
  auditLogModel = AuditLog,
  createSplitId = generateSplitId,
} = {}) {
  async function getCurrentWorkoutSplit(userId) {
    const user = await getUserForSplitAccess(userId);
    if (!user.currentSplitId) {
      throw createServiceError("User has no active workout split", 404);
    }

    const split = await workoutSplitModel.findOne({ split_id: user.currentSplitId });
    if (!split) {
      throw createServiceError("Current workout split not found", 404);
    }

    return split;
  }

  async function updateCurrentWorkoutSplit(userId, changes, auditContext = {}) {
    const user = await getUserForSplitAccess(userId);
    if (!user.currentSplitId) {
      throw createServiceError("User has no active workout split", 404);
    }

    let split = await workoutSplitModel.findOne({ split_id: user.currentSplitId });
    if (!split) {
      throw createServiceError("Current workout split not found", 404);
    }

    const ownsSplit = split.creatorId?.toString() === userId;
    if (!ownsSplit && !user.isAdmin) {
      const sourceSplitId = split.split_id;
      const personalSplit = await workoutSplitModel.create({
        split_id: createSplitId(),
        split_name: split.split_name,
        description: split.description,
        exercises: split.exercises,
        cover_image: split.cover_image,
        creator: user.name || "Preacher Clan Member",
        creatorId: userId,
      });

      const updatedUser = await userModel.findOneAndUpdate(
        { _id: userId, currentSplitId: sourceSplitId },
        { $set: { currentSplitId: personalSplit.split_id } },
        { new: true }
      );
      if (!updatedUser) {
        await workoutSplitModel.deleteOne({ _id: personalSplit._id });
        throw createServiceError(
          "Your active workout split changed during this update; retry the request",
          409
        );
      }
      split = personalSplit;
    }

    const before = toSnapshot(split);
    const update = {};
    if (changes.split_name !== undefined) update.split_name = changes.split_name;
    if (changes.description !== undefined) update.description = changes.description;

    const updatedDays = (changes.day_overrides || []).map(({ day }) => day);
    if (updatedDays.length) {
      const replacements = new Map(
        changes.day_overrides.map(({ day, exercises }) => [day, exercises])
      );
      update.exercises = [
        ...split.exercises.filter((exercise) => !replacements.has(exercise.day)),
        ...DAY_CODES.flatMap((day) =>
          (replacements.get(day) || []).map((exercise) => ({ ...exercise, day }))
        ),
      ];
    }

    const version = split.__v ?? 0;
    const versionMatch =
      version === 0
        ? { $or: [{ __v: 0 }, { __v: { $exists: false } }] }
        : { __v: version };
    const updatedSplit = await workoutSplitModel.findOneAndUpdate(
      { _id: split._id, ...versionMatch },
      { $set: update, $inc: { __v: 1 } },
      { new: true, runValidators: true }
    );

    if (!updatedSplit) {
      throw createServiceError(
        "Workout split changed during this update; retry the request",
        409
      );
    }

    const after = toSnapshot(updatedSplit);
    await auditLogModel.create({
      timestamp: new Date(),
      actor: {
        userId,
        role: user.isAdmin ? "admin" : "user",
        source: "mcp",
      },
      ...(auditContext.clientId ? { clientId: auditContext.clientId } : {}),
      ...(auditContext.scopes ? { scopes: auditContext.scopes } : {}),
      action: "update_workout_split",
      splitId: updatedSplit.split_id,
      changes: { before, after },
    });

    return {
      split: updatedSplit,
      updatedDays,
      ...(ownsSplit ? {} : { copiedFromSplitId: user.currentSplitId }),
    };
  }

  return {
    getCurrentWorkoutSplit,
    updateCurrentWorkoutSplit,
  };
}

module.exports = {
  ...createSplitService(),
  createSplitService,
};
