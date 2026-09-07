require('dotenv').config();
const mongoose = require('mongoose');
const Review = require('./Models/Review');

mongoose.connect(process.env.URI).then(async () => {
  const reviews = await Review.find();
  console.log("All ratings types:", reviews.map(r => typeof r.rating + " " + r.rating));

  process.exit(0);
});
