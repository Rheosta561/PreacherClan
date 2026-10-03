const User = require("../Models/User");
const TrainingSession = require("../Models/TrainingSession");

function createUserService({
  userModel = User,
  trainingSessionModel = TrainingSession,
} = {}) {
  async function getUserContext(userId, { includeTrainingHistory = true } = {}) {
    const user = await userModel.findById(userId).populate("profile");
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const profile = user.profile;
    const recentSessions = includeTrainingHistory
      ? await trainingSessionModel
          .find({
            userId,
            status: { $in: ["completed", "cancelled"] },
          })
          .sort({ completedAt: -1 })
          .limit(7)
          .select("splitId day status completedAt -_id")
          .lean()
      : [];

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        username: user.username || null,
        age: user.age ?? null,
        isTrainer: Boolean(user.isTrainer),
        isVerified: Boolean(user.isVerified),
        streak: {
          count: user.streak?.count ?? 0,
          todayUpdated: Boolean(user.streak?.todayUpdated),
        },
        preacherScore: user.preacherScore ?? 0,
        gymMembership: user.gymMembership
          ? {
              status: user.gymMembership.status || "None",
              plan: user.gymMembership.plan || "None",
            }
          : null,
        currentSplitId: user.currentSplitId || null,
      },
      profile: {
        about: profile?.about || null,
        fitnessGoals: profile?.fitnessGoals || [],
        ambition: profile?.ambition || [],
        exerciseGenre: profile?.exerciseGenre || [],
        timings: profile?.timings || null,
      },
      recentSessions: recentSessions.map((session) => ({
        splitId: session.splitId,
        day: session.day,
        status: session.status,
        completedAt: session.completedAt?.toISOString() || null,
      })),
    };
  }

  async function getUserForSplitAccess(userId) {
    const user = await userModel.findById(userId).select("_id currentSplitId isAdmin");
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
    return user;
  }

  return {
    getUserContext,
    getUserForSplitAccess,
  };
}

module.exports = {
  ...createUserService(),
  createUserService,
};
