const mongoose = require("mongoose");

const actionTypes = ["check_in", "check_out"];
const statuses = ["Checked In", "Checked Out", "Denied"];
const sources = ["QR", "Manual", "RFID", "Mobile"];

const EntryLogSchema = new mongoose.Schema(
  {
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gym",
      required: true,
      index: true,
    },
    memberUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    memberNameSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    memberUsernameSnapshot: {
      type: String,
      trim: true,
    },
    memberImageSnapshot: {
      type: String,
      trim: true,
    },
    membershipTypeSnapshot: {
      type: String,
      trim: true,
    },
    actionType: {
      type: String,
      enum: actionTypes,
      required: true,
    },
    status: {
      type: String,
      enum: statuses,
      required: true,
    },
    source: {
      type: String,
      enum: sources,
      required: true,
    },
    occurredAt: {
      type: Date,
      required: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
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

EntryLogSchema.index({ gymId: 1, occurredAt: -1 });
EntryLogSchema.index({ gymId: 1, memberUserId: 1, occurredAt: -1 });
EntryLogSchema.index({ gymId: 1, status: 1, source: 1, occurredAt: -1 });

module.exports = mongoose.models.EntryLog || mongoose.model("EntryLog", EntryLogSchema);
