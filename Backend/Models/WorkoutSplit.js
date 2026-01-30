const mongoose = require("mongoose");

const ExerciseSchema = new mongoose.Schema(
  {
    day: { type: String, required: true }, // Mo, Tu, etc
    name: { type: String, required: true },
    sets: { type: Number, required: true },
    reps: { type: Number, required: true },
    description: String,
    image: String,
    youtube: String,
    target_muscles: [String],
    equipment: String,
    difficulty: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
    },
    instructions: [String],
  },
  { _id: false } // no separate _id per exercise
);

const WorkoutSplitSchema = new mongoose.Schema(
  {
    split_id: { type: String, unique: true, index: true },
    split_name: { type: String, required: true },
    creator: { type: String, required: true },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    description: { type: String, required: true },
    exercises: [ExerciseSchema],

    cover_image: String,
    trending: { type: Boolean, default: false },
    trusted: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WorkoutSplit", WorkoutSplitSchema);
