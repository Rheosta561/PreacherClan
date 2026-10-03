const UserService = require("./UserService");
const WorkoutSplit = require("../Models/WorkoutSplit");
const AuditLog = require("../Models/AuditLog");

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
  auditLogModel = AuditLog,
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

  async function updateCurrentWorkoutSplit(userId, changes) {
    const user = await getUserForSplitAccess(userId);
    if (!user.currentSplitId) {
      throw createServiceError("User has no active workout split", 404);
    }

    const split = await workoutSplitModel.findOne({ split_id: user.currentSplitId });
    if (!split) {
      throw createServiceError("Current workout split not found", 404);
    }

    const ownsSplit = split.creatorId?.toString() === userId;
    if (!ownsSplit && !user.isAdmin) {
      throw createServiceError("You are not authorized to update this workout split", 403);
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
      action: "update_workout_split",
      splitId: updatedSplit.split_id,
      changes: { before, after },
    });

    return {
      split: updatedSplit,
      updatedDays,
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
