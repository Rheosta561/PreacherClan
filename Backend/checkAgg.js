require('dotenv').config();
const mongoose = require('mongoose');
const Review = require('./Models/Review');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const review = await Review.findOne({});
  if (review) {
    const gymIdStr = review.gymId.toString();
    console.log("String match:", await Review.aggregate([{ $match: { gymId: gymIdStr } }]));
    console.log("ObjectId match:", await Review.aggregate([{ $match: { gymId: new mongoose.Types.ObjectId(gymIdStr) } }]));
  }
  process.exit(0);
});
