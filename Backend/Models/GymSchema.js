const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const GymSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    location: { type: String, required: true },
    image: { type: String,  },
    profileImage: { type: String,  },
    description: { type: String, required: true },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    totalRatingSum: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
    facilities: [{ type: String, }],
    equipment: [{ type: String, }],
    membership: {
        monthly: { type: Number, default: 0 },
        quarterly: { type: Number, default: 0 },
        halfYearly: { type: Number, default: 0 },
        yearly: { type: Number, default: 0 },
    },
    address: {
        country: String,
        state: String,
        city: String,
        latitude: Number,
        longitude: Number,
        lattitude: Number,
    },
    contact: { email: String, phone: String },
    gallery: [{ type: String }],
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    trainers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    memberSince: { type: Date, required: true },
    gymCode:{type:String , required:true},
    isActive: { type: Boolean, default: true },
    refreshTokenHash: { type: String, select: false },
    refreshSessions: { type: Array, default: [], select: false },
    lastLoginAt: Date,
});

GymSchema.pre('save', async function hashPassword(next) {
    if (!this.isModified('password') || !this.password) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

GymSchema.methods.comparePassword = function comparePassword(password) {
    return bcrypt.compare(password, this.password);
};

GymSchema.methods.toSafeObject = function toSafeObject() {
    const value = this.toObject({ versionKey: false });
    delete value.password;
    delete value.refreshTokenHash;
    delete value.refreshSessions;
    return value;
};

const Gym = mongoose.model("Gym", GymSchema);



module.exports = Gym;