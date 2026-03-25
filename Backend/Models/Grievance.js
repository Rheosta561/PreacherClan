const mongoose = require("mongoose");

const grievanceTypes = ["Billing", "Facility", "Staff", "Safety", "Other"];
const grievanceStatuses = ["Open", "In Review", "Resolved", "Closed"];
const grievancePriorities = ["Low", "Medium", "High"];

const reminderMetaSchema = new mongoose.Schema(
  {
    lastReminderSentAt: {
      type: Date,
      default: null,
    },
    reminderCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const GrievanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gym",
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    type: {
      type: String,
      enum: grievanceTypes,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: grievanceStatuses,
      default: "Open",
      index: true,
    },
    priority: {
      type: String,
      enum: grievancePriorities,
      default: "Medium",
    },
    attachments: {
      type: [String],
      default: [],
    },
    notesByGym: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: null,
    },
    reminderMeta: {
      type: reminderMetaSchema,
      default: () => ({}),
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

GrievanceSchema.index({ gymId: 1, status: 1, type: 1, createdAt: -1 });
GrievanceSchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.Grievance || mongoose.model("Grievance", GrievanceSchema);
