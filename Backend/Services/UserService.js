const User = require("../Models/User");
const TrainingSession = require("../Models/TrainingSession");

function getGymId(gym) {
  if (!gym) return null;
  if (typeof gym === "object" && !gym.toHexString) {
    const id = gym.id ?? gym._id;
    return id ? id.toString() : null;
  }
  return gym.toString();
}

function getGymName(gym) {
  return gym && typeof gym === "object" && typeof gym.name === "string"
    ? gym.name
    : null;
}

function toMembershipContext(membership) {
  if (!membership) return null;
  const plan = membership.membershipType || membership.plan || null;
  const status = membership.membershipStatus || membership.status || null;
  return {
    gymId: getGymId(membership.gymId ?? membership.gym),
    gymName:
      membership.gymName ||
      getGymName(membership.gymId) ||
      getGymName(membership.gym) ||
      null,
    plan,
    status,
    membershipType: plan,
    membershipStatus: status,
    membershipStartsAt:
      membership.membershipStartsAt || membership.startDate || null,
    membershipEndsAt:
      membership.membershipEndsAt || membership.endDate || null,
    joinedAt: membership.joinedAt || null,
    revokedAt: membership.revokedAt || null,
    revokedReason: membership.revokedReason || null,
  };
}

function toGymContext(gym, membership) {
  const membershipGym = membership?.gymId ?? membership?.gym;
  const source = gym || membershipGym;
  if (!source) return null;
  const id = getGymId(source);
  const name =
    getGymName(source) ||
    membership?.gymName ||
    getGymName(membershipGym) ||
    null;
  return id || name ? { id, name } : null;
}

function createUserService({
  userModel = User,
  trainingSessionModel = TrainingSession,
} = {}) {
  async function getUserContext(userId, { includeTrainingHistory = true } = {}) {
    const user = await userModel
      .findById(userId)
      .populate(["profile", "gymMembership.gym", "gymMembership.gymId"]);
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
        gym: toGymContext(user.gym, user.gymMembership),
        gymMembership: toMembershipContext(user.gymMembership),
        gymMembershipHistory: (user.gymMembershipHistory || []).map(
          toMembershipContext
        ),
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
    const user = await userModel.findById(userId).select("_id name currentSplitId isAdmin");
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
