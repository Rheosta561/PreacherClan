const e = require('express');
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, unique: true },
  email: { type: String, required: true },
  password: { type: String },

  // Relationships
  profile: { type: mongoose.Schema.Types.ObjectId, ref: "Profile" },
  workoutPlan: { type: mongoose.Schema.Types.ObjectId, ref: "WorkoutPlan" },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym" },

  // Roles
  isAdmin: { type: Boolean, default: false },
  isTrainer: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },

  // Fitness Data
  streak: { type: Number, default: 0 },
  lastWorkout: { type: mongoose.Schema.Types.ObjectId },
  todaysWorkout: { type: mongoose.Schema.Types.ObjectId },
  workoutHitsPerWeek: { type: Number, default: 0 },
  preacherScore: { type: Number, default: 0 },

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
