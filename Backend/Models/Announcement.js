const mongoose = require("mongoose");

const categories = ["Facility", "Events", "Policy", "Offer", "Maintenance"];
const audiences = ["All Members", "Trainers", "Staff"];
const statuses = ["Draft", "Sent", "Failed"];

const channelStatsSchema = new mongoose.Schema(
  {
    attempted: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
  },
  { _id: false }
);

const failedRecipientSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    channel: { type: String, enum: ["push", "email", "socket"] },
    reason: { type: String, trim: true },
  },
  { _id: false }
);

const AnnouncementSchema = new mongoose.Schema(
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
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    category: {
      type: String,
      enum: categories,
      required: true,
      index: true,
    },
    audience: {
      type: String,
      enum: audiences,
      required: true,
      index: true,
    },
    deliveryChannels: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
    },
    deliveryStatus: {
      push: { type: channelStatsSchema, default: () => ({}) },
      email: { type: channelStatsSchema, default: () => ({}) },
      socket: { type: channelStatsSchema, default: () => ({}) },
    },
    status: {
      type: String,
      enum: statuses,
      default: "Sent",
      index: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    subjectLine: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    targetUserCount: {
      type: Number,
      default: 0,
    },
    failedRecipients: {
      type: [failedRecipientSchema],
      default: [],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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
  },
  { timestamps: true }
);

AnnouncementSchema.index({ gymId: 1, createdAt: -1 });
AnnouncementSchema.index({ gymId: 1, category: 1, audience: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.Announcement || mongoose.model("Announcement", AnnouncementSchema);
