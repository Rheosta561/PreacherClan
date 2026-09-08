const e = require('express');
const mongoose = require('mongoose');

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
  gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym" },
  gymMembership: {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym" },
    plan: { type: String, enum: ["Monthly", "Quarterly", "Half-Yearly", "Yearly", "None"], default: "None" },
    startDate: { type: Date },
    endDate: { type: Date },
    status: { type: String, enum: ["Active", "Expired", "Cancelled", "None"], default: "None" }
  },

  // Roles
  isAdmin: { type: Boolean, default: false },
  isTrainer: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  onboardingCompleted: { type: Boolean, default: false },

  // Fitness Data
  streak: {
    count: { type: Number, default: 0 },
    todayUpdated: { type: Boolean, default: false },
  },
  lastWorkout: { type: mongoose.Schema.Types.ObjectId },
  todaysWorkout: { type: mongoose.Schema.Types.ObjectId },
  workoutHitsPerWeek: { type: Number, default: 0 },
  preacherScore: { type: Number, default: 0, index: -1 },

  // Monthly Reset Fields
  lastMonthlyReset: { type: Date },
  monthlyHistory: [{
    month: {String , enum: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], },
    streak: Number,
    preacherScore: Number
  }],

  partner : [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
});

module.exports = mongoose.model('User', userSchema);
