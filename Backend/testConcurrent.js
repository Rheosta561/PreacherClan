require('dotenv').config();
const mongoose = require('mongoose');
const Gym = require('./Models/GymSchema');
const Review = require('./Models/Review');
const User = require('./Models/User');
const { updateOwnReview, createReview } = require('./Services/reviewService');

mongoose.connect(process.env.URI).then(async () => {
  const gym = await Gym.findOne();
  const user = await User.findOne();
  console.log("Using gym:", gym._id, "user:", user._id);
  
  // Clean up reviews
  await Review.deleteMany({});
  await Gym.findByIdAndUpdate(gym._id, { rating: 0, reviewCount: 0 });

  // Create review
  console.log("Creating review...");
  const res1 = await createReview(user._id, { gymId: gym._id, rating: 5, comment: "Test" });
  console.log("After create, gym rating:", res1.summary.averageRating);

  // Update review to 4
  console.log("Updating review to 4...");
  const res2 = await updateOwnReview(user._id, res1.item.id, { rating: 4 });
  console.log("After update, gym rating:", res2.summary.averageRating);

  process.exit(0);
});
