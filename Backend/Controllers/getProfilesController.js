const user = require("../Models/User");
const Profile = require("../Models/Profile");
const { rerankCandidates } = require("../Utils/recommendationEngine");
const request = require("../Models/Requests");
const mongoose = require("mongoose");
const { getNeighbors } = require("../Services/repmateMatcherService");
const toValidObjectIds = (ids) =>
  Array.from(ids)
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

const getProfiles = async (req, res) => {
  try {
    const User = await user.find({}).populate("profile").populate("gym");
    if (!User || User.length === 0) {
      return res.status(404).json({ message: "No profiles found" });
    }

    const profiles = User.map((user) => ({
      userId: user._id,
      name: user.name,
      profileImage: user.profile ? user.profile.profileImage : null,
      coverImage: user.profile ? user.profile.coverImage : null,
      about: user.profile ? user.profile.about : null,
      socialHandles: user.profile ? user.profile.socialHandles : {},
      fitnessGoals: user.profile ? user.profile.fitnessGoals : [],
      timings: user.profile ? user.profile.timings : "",
      ambition: user.profile ? user.profile.ambition : [],
      exerciseGenre: user.profile ? user.profile.exerciseGenre : [],
      preacherRank: user.profile ? user.profile.preacherRank : 0,
      isVerified: user.isVerified,
      isTrainer: user.isTrainer,
      gym: user.gym || null,
      followersCount: user.followers ? user.followers.length : 0,
      friends: user.partner
        ? user.partner.map((partner) => ({
            id: partner._id,
            name: partner.name,
            image: partner.image,
          }))
        : [],
    }));
    return res.status(200).json({ profiles });
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
const getProfileById = async (req, res) => {
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

    /* -------- SEMANTIC VECTOR SEARCH (REPMATE MATCHER) -------- */
    const requestedCount = Math.min(skip + limit, 100);
    let vectorUsers = [];
    const hasProfileText = Boolean(currentUser.profile && [
      currentUser.profile.about,
      ...(currentUser.profile.fitnessGoals || []),
      ...(currentUser.profile.ambition || []),
      ...(currentUser.profile.exerciseGenre || []),
      currentUser.profile.timings,
    ].some((value) => String(value || "").trim()));

    if (hasProfileText) {
      try {
        const matches = await getNeighbors(
          userId,
          currentUser.profile,
          [...excludeUserIds],
          requestedCount,
        );
        const rankedMatches = (matches?.neighbors || []).filter(
          (match) => !excludeUserIds.has(String(match.user_id)),
        );
        const matchedIds = rankedMatches
          .map((match) => match.user_id)
          .filter((id) => mongoose.Types.ObjectId.isValid(id));
        const hydratedUsers = await user.find({ _id: { $in: toValidObjectIds(matchedIds) } })
          .populate("profile")
          .populate("gym")
          .populate("partner")
          .lean();
        const usersById = new Map(hydratedUsers.map((candidate) => [String(candidate._id), candidate]));
        vectorUsers = rankedMatches.flatMap((match) => {
          const candidate = usersById.get(String(match.user_id));
          return candidate ? [{ ...candidate, semanticScore: Number(match.similarity) || 0 }] : [];
        });
      } catch (err) {
        console.error("RepMate matcher unavailable, falling back to Atlas vector search:", err.message);
        if (currentUser.profile?.embedding?.length) {
          try {
            const semanticProfiles = await Profile.aggregate([
              { $vectorSearch: {
                index: "vector_index",
                path: "embedding",
                queryVector: currentUser.profile.embedding,
                numCandidates: Math.max(100, requestedCount * 5),
                limit: requestedCount * 2,
              } },
              { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "userDoc" } },
              { $unwind: "$userDoc" },
              { $match: { "userDoc._id": { $nin: excludedObjectIds } } },
              { $project: { semanticScore: { $meta: "vectorSearchScore" }, userDoc: 1 } },
            ]);
            const ids = semanticProfiles.map((item) => item.userDoc._id);
            const hydratedUsers = await user.find({ _id: { $in: ids } })
              .populate("profile").populate("gym").populate("partner").lean();
            const byId = new Map(semanticProfiles.map((item) => [String(item.userDoc._id), item]));
            vectorUsers = hydratedUsers.map((candidate) => ({
              ...candidate,
              semanticScore: byId.get(String(candidate._id))?.semanticScore || 0,
            }));
          } catch (fallbackError) {
            console.error("Atlas vector fallback failed:", fallbackError.message);
          }
        }
      }
    }

    /* -------- GEO / FALLBACK USERS -------- */

    let geoUsers = [];
    let nonGeoUsers = [];
    
    const vectorUserIds = vectorUsers.map(u => u._id.toString());
    const combinedExcludedIds = [...excludedObjectIds, ...vectorUsers.map(u => u._id)];

    // Only run geo fallback if we don't have enough vector matches
    if (vectorUsers.length < requestedCount && currentUser.location?.coordinates?.length === 2) {
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
        { $limit: requestedCount - vectorUsers.length },
      ]);

      geoUsers = await user.populate(rawGeoUsers, [
        { path: "profile" },
        { path: "gym" },
        { path: "partner" },
      ]);
    }

    const geoIds = geoUsers.map((u) => u._id);
    const finalExcluded = [...combinedExcludedIds, ...geoIds];
    const remainingLimit = requestedCount - (vectorUsers.length + geoUsers.length);

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
    combinedUsers = rerankCandidates(currentUser, combinedUsers, requestedCount);

    /* -------- FINAL PROFILES MAPPING -------- */

    const pageUsers = combinedUsers.slice(skip, skip + limit);
    const profiles = pageUsers.map((u) => ({
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

const getTopPreachersOfTown = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 5, 10);

    const currentUser = await user
      .findById(userId)
      .populate("profile")
      .populate("gym");

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // exclusion logic
    const excludeUserIds = new Set([userId.toString()]);

    currentUser.partner?.forEach((p) => excludeUserIds.add(p.toString()));

    const pendingRequests = await request
      .find({
        status: "pending",
        $or: [{ sender: userId }, { receiver: userId }],
      })
      .select("sender receiver");

    pendingRequests.forEach((r) => {
      excludeUserIds.add(r.sender.toString());
      excludeUserIds.add(r.receiver.toString());
    });

    const excludedObjectIds = Array.from(excludeUserIds).map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    //  locallity
    let cityFilter = {};

    if (currentUser.gym?.city) {
      cityFilter = { "gym.city": currentUser.gym.city };
    }

    // toppreachers
    const topPreachers = await user
      .find({
        _id: { $nin: excludedObjectIds },
        preacherScore: { $gt: 0 },
        ...cityFilter,
      })
      .sort({ preacherScore: -1 })
      .limit(limit)
      .populate("profile")
      .populate("gym")
      .lean();

    const profiles = topPreachers.map((u) => ({
      userId: u._id,
      name: u.name,
      profileImage: u.profile?.profileImage || null,
      preacherScore: u.preacherScore || 0,
      isVerified: u.isVerified,
      isTrainer: u.isTrainer,
      gym: u.gym || null,
      timings: u.profile?.timings || "Flexible",
      fitnessGoals: u.profile?.fitnessGoals || [],
    }));

    return res.status(200).json({
      count: profiles.length,
      profiles,
    });
  } catch (error) {
    console.error("getTopPreachersOfTown error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  getProfiles,
  getProfileById,
  getTopPreachersOfTown,
};
