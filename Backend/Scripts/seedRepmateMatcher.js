const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
require("../Models/User"); // Register the population target for Profile.userId.
const Profile = require("../Models/Profile");
const { enqueueProfileUpsert } = require("../Services/repmateMatcherService");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 0;
const concurrencyArg = process.argv.find((arg) => arg.startsWith("--concurrency="));
const concurrency = Math.max(1, Math.min(Number(concurrencyArg?.split("=")[1]) || 4, 20));

async function main() {
  const mongoUri = process.env.URI || process.env.MONGO_URI;
  if (!mongoUri) throw new Error("Set URI or MONGO_URI in the backend .env file");
  if (!dryRun && (!process.env.REPMATE_MATCHER_URL || !process.env.REPMATE_MATCHER_SECRET)) {
    throw new Error("Set REPMATE_MATCHER_URL and REPMATE_MATCHER_SECRET before running the backfill");
  }

  await mongoose.connect(mongoUri);
  try {
    let query = Profile.find({})
      .select("userId about fitnessGoals ambition exerciseGenre timings")
      .populate({ path: "userId", select: "gym" })
      .lean();
    if (limit > 0) query = query.limit(limit);

    const profiles = await query.exec();
    const linkedProfiles = profiles.filter((profile) => profile.userId?._id);
    const missingOwner = profiles.length - linkedProfiles.length;
    const hasSemanticText = (profile) => [profile.about, ...(profile.fitnessGoals || []),
      ...(profile.ambition || []), ...(profile.exerciseGenre || []), profile.timings]
      .some((value) => String(value || "").trim());
    const eligible = linkedProfiles.filter(hasSemanticText);
    const noSemanticText = linkedProfiles.length - eligible.length;

    console.log(`Found ${profiles.length} profiles; ${linkedProfiles.length} have a linked user.`);
    console.log(`${eligible.length} have profile text to send to Pinecone; ${noSemanticText} have no useful text and will be skipped.`);
    if (missingOwner) console.warn(`Skipping ${missingOwner} profiles without a linked user.`);
    if (dryRun) {
      console.log("Dry run only. Pinecone was not called and no ingestion events were queued.");
      return;
    }

    let cursor = 0;
    let queued = 0;
    let failed = 0;
    const failures = [];
    const workers = Array.from({ length: concurrency }, async () => {
      while (true) {
        const index = cursor++;
        if (index >= eligible.length) return;
        const profile = eligible[index];
        const userId = String(profile.userId._id);
        const gym = profile.userId.gym;
        const gymId = gym?._id || gym?.gymId || gym || null;
        try {
          await enqueueProfileUpsert({ ...profile, userId }, gymId);
          queued += 1;
        } catch (error) {
          failed += 1;
          failures.push({ userId, message: error.message });
          console.error(`Failed to enqueue profile ${userId}: ${error.message}`);
        }
        if ((queued + failed) % 50 === 0) {
          console.log(`Processed ${queued + failed}/${eligible.length}; queued ${queued}, failed ${failed}.`);
        }
      }
    });

    await Promise.all(workers);
    console.log(`Backfill enqueue complete: ${queued} queued, ${failed} failed.`);
    console.log("Queued means accepted by the matcher queue; check the queue and Pinecone ingestion logs for completion.");
    console.log("Pinecone generates embeddings from the queued profile text.");
    if (failed) process.exitCode = 1;
    if (failures.length) {
      console.error(`Rerun the script to retry failed IDs; Pinecone upserts use stable user IDs and are safe to repeat.`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("RepMate matcher backfill failed:", error.message);
  process.exitCode = 1;
  mongoose.disconnect().catch(() => {});
});
