const mongoose = require('mongoose');
const User = require('./User'); 
const numberOfUsers = User.countDocuments().exec();
const ProfileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    profileImage: { type: String }, 
    coverImage: { type: String }, 
    about: { type: String },
    socialHandles: {
        instagram: String,
        twitter: String,
        facebook: String,
        youtube: String
    },
    fitnessGoals: [{ type: String }], 
    ambition: [{ type: String }], 
    exerciseGenre: [{ type: String, enum: ["Cardio", "Weight Training"] }],
    milestones: [{ type: mongoose.Schema.Types.ObjectId, ref: "Milestone" }],
    preacherRank: { type: Number, default: numberOfUsers },

});

const Profile = mongoose.model("Profile", ProfileSchema);
module.exports = Profile;