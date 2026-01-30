const user = require('../Models/User');
const request = require('../Models/Requests');
const mongoose = require('mongoose')



const getProfiles = async (req, res) => {
    try {
        const User = await user.find({}).populate('profile').populate('gym');
        if (!User || User.length === 0) {
            return res.status(404).json({ message: "No profiles found" });
        }

        const profiles = User.map(user => ({
            userId: user._id,
            name: user.name,
            profileImage: user.profile ? user.profile.profileImage : null,
            coverImage: user.profile ? user.profile.coverImage : null,
            about: user.profile ? user.profile.about : null,
            socialHandles: user.profile ? user.profile.socialHandles : {},
            fitnessGoals: user.profile ? user.profile.fitnessGoals : [],
            ambition: user.profile ? user.profile.ambition : [],
            exerciseGenre: user.profile ? user.profile.exerciseGenre : [],
            preacherRank: user.profile ? user.profile.preacherRank : 0,
            isVerified: user.isVerified,
            isTrainer: user.isTrainer,
            gym: user.gym || null ,
            followersCount: user.followers ? user.followers.length : 0,
            friends : user.partner ? user.partner.map(partner => ({
                id: partner._id,
                name: partner.name,
                image : partner.image, }) ) : [],

        }));
        return res.status(200).json({ profiles });

        
    } catch (error) {
        console.error("Error fetching profiles:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
        
    }
}

const getProfileById = async (req, res) => {
  try {
    const { userId } = req.params;

    // pagination
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    // current user
    const currentUser = await user
      .findById(userId)
      .populate("profile")
      .populate("gym")
      .populate("partner");

    if (!currentUser) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // exclusions
    const excludeUserIds = new Set([userId.toString()]);

    currentUser.partner?.forEach(p =>
      excludeUserIds.add(p._id.toString())
    );

    const pendingRequests = await request.find({
      status: "pending",
      $or: [{ sender: userId }, { receiver: userId }],
    }).select("sender receiver");

    pendingRequests.forEach(r => {
      excludeUserIds.add(r.sender.toString());
      excludeUserIds.add(r.receiver.toString());
    });

    const excludedObjectIds = Array.from(excludeUserIds).map(
      id => new mongoose.Types.ObjectId(id)
    );

    let geoUsers = [];
    let nonGeoUsers = [];

    // GEO USERS (nearest first)
    if (currentUser.location?.coordinates?.length === 2) {
      const [lng, lat] = currentUser.location.coordinates;

      geoUsers = await user.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lng, lat] },
            distanceField: "distance",
            spherical: true,
            maxDistance: 10000,
          },
        },
        {
          $match: {
            _id: { $nin: excludedObjectIds },
          },
        },
        { $skip: skip },
        { $limit: limit },
      ]);

      geoUsers = await user.populate(geoUsers, [
        { path: "profile" },
        { path: "gym" },
        { path: "partner" },
      ]);
    }

    const geoIds = geoUsers.map(u => u._id);

    // NON-GEO USERS (fill remaining slots)
    const remainingLimit = limit - geoUsers.length;

    if (remainingLimit > 0) {
      nonGeoUsers = await user
        .find({
          _id: {
            $nin: [...excludedObjectIds, ...geoIds],
          },
        })
        .populate("profile")
        .populate("gym")
        .populate("partner")
        .skip(skip > 0 ? 0 : 0) // skip already handled by geo
        .limit(remainingLimit)
        .lean();
    }

    // merge results
    const combinedUsers = [...geoUsers, ...nonGeoUsers];

    //  transform response
    const profiles = combinedUsers.map(u => ({
      userId: u._id,
      name: u.name,
      profileImage: u.profile?.profileImage || null,
      coverImage: u.profile?.coverImage || null,
      about: u.profile?.about || null,
      socialHandles: u.profile?.socialHandles || {},
      fitnessGoals: u.profile?.fitnessGoals || [],
      ambition: u.profile?.ambition || [],
      exerciseGenre: u.profile?.exerciseGenre || [],
      preacherRank: u.profile?.preacherRank || 0,
      isVerified: u.isVerified,
      isTrainer: u.isTrainer,
      gym: u.gym || null ,
      followersCount: u.followers?.length || 0,
      friends:
        u.partner?.map(p => ({
          id: p._id,
          name: p.name,
          image: p.image,
        })) || [],
      distance: u.distance ? Math.round(u.distance / 1000) : null,
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

    const currentUser = await user.findById(userId)
      .populate("profile")
      .populate("gym");

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

// exclusion logic 
    const excludeUserIds = new Set([userId.toString()]);

    currentUser.partner?.forEach(p =>
      excludeUserIds.add(p.toString())
    );

    const pendingRequests = await request.find({
      status: "pending",
      $or: [{ sender: userId }, { receiver: userId }],
    }).select("sender receiver");

    pendingRequests.forEach(r => {
      excludeUserIds.add(r.sender.toString());
      excludeUserIds.add(r.receiver.toString());
    });

    const excludedObjectIds = Array.from(excludeUserIds).map(
      id => new mongoose.Types.ObjectId(id)
    );

  //  locallity 
    let cityFilter = {};

    if (currentUser.gym?.city) {
      cityFilter = { "gym.city": currentUser.gym.city };
    }

  // toppreachers 
    const topPreachers = await user.find({
      _id: { $nin: excludedObjectIds },
      preacherScore: { $gt: 0 },
      ...cityFilter,
    })
      .sort({ preacherScore: -1 })
      .limit(limit)
      .populate("profile")
      .populate("gym")
      .lean();

    
    const profiles = topPreachers.map(u => ({
      userId: u._id,
      name: u.name,
      profileImage: u.profile?.profileImage || null,
      preacherScore: u.preacherScore || 0,
      isVerified: u.isVerified,
      isTrainer: u.isTrainer,
      gym: u.gym || null ,
      timings : u.profile?.timngs || "Flexible" ,
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
    getProfiles , getProfileById , getTopPreachersOfTown
};

