const mongoose = require("mongoose");

const normalizeTags = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
};

const GymTrainerSchema = new mongoose.Schema(
  {
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gym",
      required: true,
      index: true,
    },
    trainerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fee: {
      type: Number,
      default: 0,
      min: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    assignedMembers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
  },
  { timestamps: true }
);

GymTrainerSchema.pre("validate", function normalizeTrainerTags(next) {
  this.tags = normalizeTags(this.tags);
  next();
});

GymTrainerSchema.index({ gymId: 1, trainerUserId: 1 }, { unique: true });

module.exports = mongoose.models.GymTrainer || mongoose.model("GymTrainer", GymTrainerSchema);
