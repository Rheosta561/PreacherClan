const mongoose = require("mongoose");

const categories = ["Equipment", "Facility", "Safety", "Cleaning"];
const statuses = ["Scheduled", "In Progress", "Completed", "Cancelled"];

const MaintenanceSchema = new mongoose.Schema(
  {
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gym",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      enum: categories,
      required: true,
      index: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: statuses,
      default: "Scheduled",
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    createdBy: {
      actorType: {
        type: String,
        enum: ["gym", "user"],
        default: "gym",
      },
      actorId: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

MaintenanceSchema.index({ gymId: 1, status: 1, category: 1, scheduledAt: -1 });
MaintenanceSchema.index({ gymId: 1, title: 1 });

module.exports = mongoose.models.Maintenance || mongoose.model("Maintenance", MaintenanceSchema);
