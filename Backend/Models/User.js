const e = require('express');
const mongoose = require('mongoose');

const GymMembershipSchema = new mongoose.Schema(
  {
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: "Gym" },
    gymName: String,
    membershipType: {
      type: String,
      enum: ["Monthly", "Quarterly", "HalfYearly", "Yearly"],
    },
    membershipStatus: {
      type: String,
      enum: ["Active", "Paused", "Expired", "Revoked"],
    },
    membershipStartsAt: Date,
    membershipEndsAt: Date,
    joinedAt: Date,
    revokedAt: Date,
    revokedReason: String,
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym" },
    plan: { type: String, enum: ["Monthly", "Quarterly", "Half-Yearly", "Yearly", "None"] },
    startDate: Date,
    endDate: Date,
    status: { type: String, enum: ["Active", "Expired", "Cancelled", "None"] },
  },
  { _id: false }
);

const ChallengeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    rules: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
    isCompleted: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, unique: true },
  email: { type: String, required: true },
  age: { type: Number },
  password: { type: String },

  // Relationships
  profile: { type: mongoose.Schema.Types.ObjectId, ref: "Profile" },
  workoutPlan: { type: mongoose.Schema.Types.ObjectId, ref: "WorkoutPlan" },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  gym: { type: mongoose.Schema.Types.Mixed },
  gymMembership: { type: GymMembershipSchema, default: undefined },
  gymMembershipHistory: { type: [GymMembershipSchema], default: [] },

  // Roles
  isAdmin: { type: Boolean, default: false },
  isTrainer: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  onboardingCompleted: { type: Boolean, default: false },
  termsAcceptedAt: { type: Date },
  privacyPolicyAcceptedAt: { type: Date },
  termsVersion: { type: String },
  privacyPolicyVersion: { type: String },

  // Fitness Data
  streak: {
    count: { type: Number, default: 0 },
    todayUpdated: { type: Boolean, default: false },
  },
  lastWorkout: { type: mongoose.Schema.Types.ObjectId },
  todaysWorkout: { type: mongoose.Schema.Types.ObjectId },
  workoutHitsPerWeek: { type: Number, default: 0 },
  preacherScore: { type: Number, default: 0, index: -1 },
  currentSplitId: { type: String },
  pushToken: { type: String },

  // Daily generated challenges
  challenges: { type: [ChallengeSchema], default: [] },

  // Monthly Reset Fields
  lastMonthlyReset: { type: Date },
  monthlyHistory: [{
    month: {String , enum: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], },
    monthNumber: { type: Number, min: 1, max: 12 },
    year: { type: Number, min: 2000 },
    streak: Number,
    preacherScore: Number
  }],

  partner : [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
});

module.exports = mongoose.model('User', userSchema);
