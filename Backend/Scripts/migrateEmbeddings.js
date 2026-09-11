const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Profile = require("../Models/Profile");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Connect to MongoDB
const dbUri = process.env.URI || process.env.MONGO_URI;
mongoose
  .connect(dbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB for migration"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

async function generateEmbedding(text) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return null;
  }
}

async function runMigration() {
  try {
    const profiles = await Profile.find({});
    console.log(`Found ${profiles.length} profiles to process.`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < profiles.length; i++) {
      const p = profiles[i];
      
      // Construct a semantic summary of the user
      const about = p.about ? p.about.trim() : "";
      const goals = p.fitnessGoals && p.fitnessGoals.length > 0 ? p.fitnessGoals.join(", ") : "";
      const ambitions = p.ambition && p.ambition.length > 0 ? p.ambition.join(", ") : "";
      const genres = p.exerciseGenre && p.exerciseGenre.length > 0 ? p.exerciseGenre.join(", ") : "";
      const timings = p.timings ? p.timings : "";

      const textToEmbed = `
        About: ${about}
        Fitness Goals: ${goals}
        Ambitions: ${ambitions}
        Preferred Exercise Genres: ${genres}
        Preferred Timings: ${timings}
      `.trim();

      // Skip empty profiles that have literally nothing useful
      if (!about && !goals && !ambitions && !genres) {
        console.log(`Skipping profile ${p._id} due to empty semantic data.`);
        continue;
      }

      console.log(`Generating embedding for profile ${p._id}...`);
      const embedding = await generateEmbedding(textToEmbed);

      if (embedding) {
        // Use updateOne to bypass strict validation on legacy corrupt fields (like bad exerciseGenres)
        await Profile.updateOne({ _id: p._id }, { $set: { embedding } });
        successCount++;
        console.log(`[${i+1}/${profiles.length}] Successfully updated ${p._id}`);
      } else {
        failCount++;
        console.log(`[${i+1}/${profiles.length}] Failed to generate embedding for ${p._id}`);
      }

      // Small delay to prevent hitting rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`Migration complete! Successfully embedded: ${successCount}. Failed: ${failCount}.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Start migration
setTimeout(runMigration, 1000);
