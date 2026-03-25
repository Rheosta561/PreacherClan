
const mongoose = require('mongoose');

const membershipTypeEnum = ["Monthly", "Quarterly", "HalfYearly", "Yearly"];
const membershipStatusEnum = ["Active", "Paused", "Expired", "Revoked"];

const gymMembershipSchema = new mongoose.Schema({
  gymId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Gym",
  },
  gymName: {
    type: String,
    trim: true,
  },
  membershipType: {
    type: String,
    enum: membershipTypeEnum,
  },
  membershipStatus: {
    type: String,
    enum: membershipStatusEnum,
    default: "Active",
  },
  membershipStartsAt: {
    type: Date,
  },
  membershipEndsAt: {
    type: Date,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  revokedAt: {
    type: Date,
  },
  revokedReason: {
    type: String,
    trim: true,
    maxlength: 500,
  },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, unique: true },
  email: { type: String, required: true , unique:true },
  password: { type: String },
  image : {type:String},

  // Relationships
  profile: { type: mongoose.Schema.Types.ObjectId, ref: "Profile" },
  workoutPlan: { type: mongoose.Schema.Types.ObjectId, ref: "WorkoutPlan" },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  gym: {
  id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Gym",
  },
  name: {
    type: String,
  },
},
  gymMembership: {
    type: gymMembershipSchema,
    default: undefined,
  },
  gymMembershipHistory: {
    type: [gymMembershipSchema],
    default: [],
  },


  // Roles
  role: {
  type: String,
  enum: ["user", "admin" , "trainer"],
  default: "user",
},

  isVerified: { type: Boolean, default: false },

  // Fitness Data
streak: {
  type: {
    count: { type: Number, default: 0 },
    todayUpdated: { type: Boolean, default: false },
    lastUpdatedAt: { type: Date }
  },
  default: () => ({ count: 0, todayUpdated: false, lastUpdatedAt: null })
},
  lastWorkout: { type: mongoose.Schema.Types.ObjectId },
  todaysWorkout: { type: mongoose.Schema.Types.ObjectId },
  workoutHitsPerWeek: { type: Number, default: 0 },
  preacherScore: { type: Number, default: 0 },

  // Monthly Reset Fields
  lastMonthlyReset: { type: Date },
  monthlyHistory: [{
month: {
  type: String,
  enum: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ],
}
,
    streak: Number,
    preacherScore: Number
  }],

  partner : [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  challenges : [
  {
    title : String,
    description : String,
    rules: [String],
    createdAt : Date,
    isCompleted : { type: Boolean, default: false }
  }
],
refreshTokenHash:{
  type:String , 
  select: false

},
// login providers , basic and google 

googleId: { type: String },
provider: { type: String, enum: ["local", "google"], default: "local" },

onboardingCompleted: {
  type: Boolean,
  default: false,
},

pushToken: {
    type: String,
    default: null,
  },

location: {
  type: {
    type: String,
    enum: ["Point"],

  },
  coordinates: {
    type: [Number], // [longitude, latitude]

  },
  updatedAt: {
    type: Date,
  },
},



});

userSchema.index(
  { location: "2dsphere" },
  { partialFilterExpression: { "location.coordinates": { $exists: true } } }
);

userSchema.index({ "gym.id": 1, username: 1, email: 1 });
userSchema.index({ "gymMembership.gymId": 1, "gymMembership.membershipStatus": 1, "gymMembership.membershipType": 1 });


module.exports = mongoose.model('User', userSchema);
