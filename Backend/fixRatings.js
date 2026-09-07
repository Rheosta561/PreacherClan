require('dotenv').config();
const mongoose = require('mongoose');
const Gym = require('./Models/GymSchema');
const { recalculateGymReviewStats } = require('./Services/reviewService');

mongoose.connect(process.env.URI).then(async () => {
  const gyms = await Gym.find({});
  console.log(`Found ${gyms.length} gyms. Recalculating ratings...`);
  
  for (const gym of gyms) {
    try {
      const stats = await recalculateGymReviewStats(gym._id);
      console.log(`Updated gym ${gym.name} - New Rating: ${stats.averageRating} (Reviews: ${stats.totalReviews})`);
    } catch (err) {
      console.error(`Failed to update gym ${gym.name}: ${err.message}`);
    }
  }
  
  console.log("Done.");
  process.exit(0);
});
