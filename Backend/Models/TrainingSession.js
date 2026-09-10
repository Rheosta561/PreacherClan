const mongoose = require("mongoose");

const ExerciseStatSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    timeTakenSeconds: { type: Number, default: 0 },
  },
  { _id: false }
);

const TrainingSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    splitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkoutSplit",
      required: true,
    },
    day: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed", "cancelled"],
      default: "in_progress",
    },
    currentExerciseIndex: {
      type: Number,
      default: 0,
    },
    currentExerciseTimeTaken: {
      type: Number,
      default: 0,
    },
    exerciseStats: [ExerciseStatSchema],
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    preacherScoreAwarded: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TrainingSession", TrainingSessionSchema);
