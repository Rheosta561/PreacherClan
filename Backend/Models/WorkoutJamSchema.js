const mongoose = require("mongoose");

const ExerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sets: { type: Number, required: true },
    reps: { type: Number, required: true },

    description: String,
    image: String,
    youtube: String,

    instructions: [String], // step-by-step guidance

    target_muscles: [String],
    equipment: String,
    difficulty: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
    },
    order : Number ,
  },
  { _id: false }
);

const ParticipantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["ready", "in_progress", "completed"],
      default: "ready",
    },

    completedExercises: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);
const WorkoutJamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    leader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    participants: [ParticipantSchema],

    exercises: [ExerciseSchema],

    currentExerciseIndex: {
      type: Number,
      default: 0,
    },
     jamCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    state: {
      type: String,
      enum: ["lobby", "active", "completed"],
      default: "lobby",
    },

    startedAt: Date,
    endedAt: Date,
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("WorkoutJam", WorkoutJamSchema);

