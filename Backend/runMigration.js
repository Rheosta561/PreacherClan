require('dotenv').config();
const mongoose = require('mongoose');
const Gym = require('./Models/GymSchema');

mongoose.connect(process.env.URI).then(async () => {
  const gyms = await Gym.find({});
  console.log(`Migrating ${gyms.length} gyms to new rating system...`);

  for (const gym of gyms) {
    const sum = (gym.rating || 0) * (gym.reviewCount || 0);
    await Gym.updateOne({ _id: gym._id }, { totalRatingSum: sum });
    console.log(`Updated Gym ${gym.name} with totalRatingSum=${sum}`);
  }

  console.log("Migration complete.");
  process.exit(0);
});
