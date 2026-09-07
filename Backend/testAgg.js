require('dotenv').config();
const mongoose = require('mongoose');
const Review = require('./Models/Review');

mongoose.connect(process.env.URI).then(async () => {
  const review = await Review.findOne();
  console.log("Found review:", review);
  const gymId = review.gymId;
  const objectId = new mongoose.Types.ObjectId(gymId.toString());

  const stats = await Review.aggregate([
    { $match: { gymId: objectId } },
    {
      $group: {
        _id: "$gymId",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);
  
  console.log("Aggregation stats:", stats);
  process.exit(0);
});
