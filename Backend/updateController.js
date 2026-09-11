const fs = require("fs");
const path = "./Controllers/getProfilesController.js";
let code = fs.readFileSync(path, "utf8");

// 1. Add Profile import and recommendation engine
if (!code.includes("const Profile = require")) {
  code = code.replace(
    'const user = require("../Models/User");',
    `const user = require("../Models/User");\nconst Profile = require("../Models/Profile");\nconst { rerankCandidates } = require("../Utils/recommendationEngine");`
  );
}

// 2. We need to intercept the GEO USERS and NON-GEO USERS logic in getProfileById.
// Let's replace the entire getProfileById function using regex or string replacement.

const getProfileByIdRegex = /const getProfileById = async \(req, res\) => \{[\s\S]*?\n\};\n\nconst getTopPreachersOfTown/m;

const newGetProfileById = `const getProfileById = async (req, res) => {
  try {
    const { userId } = req.params;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const currentUser = await user
      .findById(userId)
      .populate("profile")
      .populate("gym")
      .populate("partner");

    if (!currentUser) {
      return res.status(404).json({ message: "Profile not found" });
    }

    /* -------- exclusion logic (SAFE) -------- */

    const excludeUserIds = new Set();

    if (mongoose.Types.ObjectId.isValid(userId)) {
      excludeUserIds.add(userId.toString());
    }

    currentUser.partner?.forEach((p) => {
      if (mongoose.Types.ObjectId.isValid(p?._id)) {
        excludeUserIds.add(p._id.toString());
      }
    });

    const pendingRequests = await request
      .find({
        status: "pending",
        $or: [{ sender: userId }, { receiver: userId }],
      })
      .select("sender receiver");

    pendingRequests.forEach((r) => {
      if (mongoose.Types.ObjectId.isValid(r.sender)) {
        excludeUserIds.add(r.sender.toString());
      }
      if (mongoose.Types.ObjectId.isValid(r.receiver)) {
        excludeUserIds.add(r.receiver.toString());
      }
    });

    const excludedObjectIds = toValidObjectIds(excludeUserIds);

    /* -------- SEMANTIC VECTOR SEARCH (ATLAS) -------- */
    
    let vectorUsers = [];
    const hasEmbedding = currentUser.profile && currentUser.profile.embedding && currentUser.profile.embedding.length > 0;

    if (hasEmbedding) {
      try {
        const semanticProfiles = await Profile.aggregate([
          {
            $vectorSearch: {
              index: "vector_index",
              path: "embedding",
              queryVector: currentUser.profile.embedding,
              numCandidates: 100,
              limit: limit * 2, // Fetch extra to account for exclusions
            }
          },
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "userDoc"
            }
          },
          { $unwind: "$userDoc" },
          { $match: { "userDoc._id": { $nin: excludedObjectIds } } },
          { $project: { semanticScore: { $meta: "vectorSearchScore" }, userDoc: 1 } }
        ]);

        const vectorUserIds = semanticProfiles.map(p => p.userDoc._id);
        
        // Fetch the full populated users
        const populatedVectorUsers = await user.find({ _id: { $in: vectorUserIds } })
          .populate("profile")
          .populate("gym")
          .populate("partner")
          .lean();

        // Attach semantic score to the lean user object
        vectorUsers = populatedVectorUsers.map(u => {
          const match = semanticProfiles.find(p => p.userDoc._id.toString() === u._id.toString());
          return { ...u, semanticScore: match ? match.semanticScore : 0 };
        });
        
      } catch (err) {
        console.error("Vector search failed, falling back to GEO:", err);
      }
    }

    /* -------- GEO / FALLBACK USERS -------- */

    let geoUsers = [];
    let nonGeoUsers = [];
    
    const vectorUserIds = vectorUsers.map(u => u._id.toString());
    const combinedExcludedIds = [...excludedObjectIds, ...vectorUsers.map(u => u._id)];

    // Only run geo fallback if we don't have enough vector matches
    if (vectorUsers.length < limit && currentUser.location?.coordinates?.length === 2) {
      const [lng, lat] = currentUser.location.coordinates;

      const rawGeoUsers = await user.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lng, lat] },
            distanceField: "distance",
            spherical: true,
            maxDistance: 10000,
          },
        },
        { $match: { _id: { $nin: combinedExcludedIds } } },
        { $limit: limit - vectorUsers.length },
      ]);

      geoUsers = await user.populate(rawGeoUsers, [
        { path: "profile" },
        { path: "gym" },
        { path: "partner" },
      ]);
    }

    const geoIds = geoUsers.map((u) => u._id);
    const finalExcluded = [...combinedExcludedIds, ...geoIds];
    const remainingLimit = limit - (vectorUsers.length + geoUsers.length);

    /* -------- NON-GEO USERS -------- */

    if (remainingLimit > 0) {
      nonGeoUsers = await user
        .find({
          _id: { $nin: finalExcluded },
        })
        .populate("profile")
        .populate("gym")
        .populate("partner")
        .limit(remainingLimit)
        .lean();
    }

    let combinedUsers = [...vectorUsers, ...geoUsers, ...nonGeoUsers];

    /* -------- COLLABORATIVE FILTERING (PEARSON RERANKING) -------- */
    
    // Rerank candidates based on interaction similarity (Gym, Friends, Split)
    combinedUsers = rerankCandidates(currentUser, combinedUsers, limit);

    /* -------- FINAL PROFILES MAPPING -------- */

    const profiles = combinedUsers.map((u) => ({
      userId: u._id,
      name: u.name,
      profileImage: u.profile?.profileImage || null,
      coverImage: u.profile?.coverImage || null,
      about: u.profile?.about || null,
      socialHandles: u.profile?.socialHandles || {},
      fitnessGoals: u.profile?.fitnessGoals || [],
      timings: u.profile?.timings || "",
      ambition: u.profile?.ambition || [],
      exerciseGenre: u.profile?.exerciseGenre || [],
      preacherRank: u.profile?.preacherRank || 0,
      isVerified: u.isVerified,
      isTrainer: u.isTrainer,
      gym: u.gym || null,
      followersCount: u.followers?.length || 0,
      friends:
        u.partner?.map((p) => ({
          id: p?._id,
          name: p?.name,
          image: p?.image,
        })) || [],
      distance: u.distance ? Math.round(u.distance / 1000) : null,
      matchScore: Math.round((u.finalScore || 0) * 100) // Exposed for UI
    }));

    return res.status(200).json({
      page,
      limit,
      count: profiles.length,
      profiles,
    });
  } catch (error) {
    console.error("getProfileById error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getTopPreachersOfTown`;

code = code.replace(getProfileByIdRegex, newGetProfileById);

fs.writeFileSync(path, code);
console.log("Successfully updated getProfilesController.js!");
