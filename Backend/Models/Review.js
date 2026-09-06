const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true },
    rating: { type: Number, required: true },
    review: { type: String, required: true }
});

const Review = mongoose.model("Review", ReviewSchema);

module.exports = Review;