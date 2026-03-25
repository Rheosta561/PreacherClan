const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
};

const refreshSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    ip: {
      type: String,
      trim: true,
      maxlength: 100,
    },
  },
  { _id: false }
);

const GymSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9._-]+$/,
    },
    password: {
      type: String,
      required: true,
      select: false,
      minlength: 8,
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    image: { type: String, trim: true },
    profileImage: { type: String, trim: true },
    gallery: [{ type: String, trim: true }],
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
    address: {
      country: { type: String, trim: true, maxlength: 100 },
      state: { type: String, trim: true, maxlength: 100 },
      city: { type: String, trim: true, maxlength: 100 },
      latitude: { type: Number, min: -90, max: 90 },
      // Kept for backward compatibility with current routes.
      lattitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
    },
    contact: {
      email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 255,
      },
      phone: {
        type: String,
        trim: true,
        maxlength: 30,
      },
    },
    facilities: [{ type: String, trim: true }],
    equipment: [{ type: String, trim: true }],
    membership: {
      monthly: { type: Number, min: 0, default: 0 },
      quarterly: { type: Number, min: 0, default: 0 },
      halfYearly: { type: Number, min: 0, default: 0 },
      yearly: { type: Number, min: 0, default: 0 },
    },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    trainers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    memberSince: {
      type: Date,
      required: true,
      default: Date.now,
    },
    gymCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    featured: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    refreshTokenHash: { type: String, select: false },
    refreshSessions: {
      type: [refreshSessionSchema],
      default: [],
      select: false,
    },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

GymSchema.pre("validate", function syncCoordinates(next) {
  if (this.address?.latitude == null && this.address?.lattitude != null) {
    this.address.latitude = this.address.lattitude;
  }

  if (this.address?.lattitude == null && this.address?.latitude != null) {
    this.address.lattitude = this.address.latitude;
  }

  this.facilities = normalizeStringArray(this.facilities);
  this.equipment = normalizeStringArray(this.equipment);
  this.gallery = normalizeStringArray(this.gallery);

  next();
});

GymSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    return next();
  }

  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
  this.password = await bcrypt.hash(this.password, rounds);
  next();
});

GymSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

GymSchema.methods.toSafeObject = function toSafeObject() {
  const gym = this.toObject({ versionKey: false });
  delete gym.password;
  delete gym.refreshTokenHash;
  delete gym.refreshSessions;
  return gym;
};

GymSchema.index({ "refreshSessions.sessionId": 1 });

const Gym = mongoose.models.Gym || mongoose.model("Gym", GymSchema);

module.exports = Gym;
