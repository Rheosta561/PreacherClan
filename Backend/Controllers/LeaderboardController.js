const user = require("../Models/User");

const getGlobalLeaderboard = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const topUsers = await user
      .find({})
      .sort({ preacherScore: -1 })
      .skip(skip)
      .limit(limit)
      .populate("profile", "profileImage fitnessGoals")
      .populate("gym", "name")
      .lean();

    const count = await user.countDocuments({});

    const leaderboard = topUsers.map((u) => ({
      userId: u._id,
      name: u.name,
      preacherScore: u.preacherScore || 0,
      profileImage: u.profile?.profileImage || null,
      gymName: u.gym?.name || null,
      fitnessGoals: u.profile?.fitnessGoals || [],
      isVerified: u.isVerified || false,
    }));

    return res.status(200).json({
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      totalUsers: count,
      leaderboard,
    });
  } catch (error) {
    console.error("Error fetching global leaderboard:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const getUserRank = async (req, res) => {
  try {
    const { userId } = req.params;

    const currentUser = await user.findById(userId).select("preacherScore");
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const score = currentUser.preacherScore || 0;
    // Calculate global rank: number of users with a strictly greater score, plus 1
    const rank = await user.countDocuments({ preacherScore: { $gt: score } }) + 1;

    return res.status(200).json({
      userId,
      preacherScore: score,
      rank,
    });
  } catch (error) {
    console.error("Error fetching user rank:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

module.exports = {
  getGlobalLeaderboard,
  getUserRank,
};
