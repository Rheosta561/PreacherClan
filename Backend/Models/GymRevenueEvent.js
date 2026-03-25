const mongoose = require("mongoose");

const eventTypes = [
  "new_membership",
  "renewal",
  "upgrade",
  "plan_change",
  "revocation_refund",
];

const GymRevenueEventSchema = new mongoose.Schema(
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
    eventType: {
      type: String,
      enum: eventTypes,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    occurredAt: {
      type: Date,
      required: true,
      index: true,
    },
    membershipType: {
      type: String,
      enum: ["Monthly", "Quarterly", "HalfYearly", "Yearly", null],
      default: null,
    },
    previousMembershipType: {
      type: String,
      enum: ["Monthly", "Quarterly", "HalfYearly", "Yearly", null],
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    metadata: {
      previousMembershipStartsAt: { type: Date, default: null },
      previousMembershipEndsAt: { type: Date, default: null },
      membershipStartsAt: { type: Date, default: null },
      membershipEndsAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

GymRevenueEventSchema.index({ gymId: 1, occurredAt: -1 });
GymRevenueEventSchema.index({ gymId: 1, memberUserId: 1, occurredAt: -1 });

module.exports =
  mongoose.models.GymRevenueEvent ||
  mongoose.model("GymRevenueEvent", GymRevenueEventSchema);
