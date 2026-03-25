const mongoose = require("mongoose");
const User = require("../Models/User");
const Gym = require("../Models/GymSchema");
const { AppError } = require("./gymAuthService");
const {
  maybeRecordMembershipRevenueUpdate,
  maybeRecordRevocationRefund,
} = require("./membershipRevenueService");

const MEMBERSHIP_STATUSES = ["Active", "Paused", "Expired", "Revoked"];
const MEMBERSHIP_TYPES = ["Monthly", "Quarterly", "HalfYearly", "Yearly"];

const parsePagination = ({ page = 1, limit = 10 }) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

const buildMembershipTableRow = (user) => ({
  id: user._id,
  name: user.name || null,
  username: user.username || null,
  email: user.email || null,
  avatar: user.image || null,
  image: user.image || null,
  membershipType: user.gymMembership?.membershipType || null,
  membershipStatus: user.gymMembership?.membershipStatus || "Active",
  membershipStartsAt: user.gymMembership?.membershipStartsAt || null,
  membershipEndsAt: user.gymMembership?.membershipEndsAt || null,
});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getGymOrThrow = async (gymId) => {
  const gym = await Gym.findById(gymId).select("_id name members");
  if (!gym) {
    throw new AppError("Gym not found", 404);
  }

  return gym;
};

const ensureMemberBelongsToGym = async (gymId, memberId, session) => {
  const gym = await Gym.findById(gymId).select("_id name members").session(session || null);
  if (!gym) {
    throw new AppError("Gym not found", 404);
  }

  const user = await User.findById(memberId).session(session || null);
  if (!user) {
    throw new AppError("Member not found", 404);
  }

  const isInGymMembers = gym.members.some((id) => id.toString() === String(memberId));
  const isLinkedOnUser = String(user.gym?.id || "") === String(gymId);

  if (!isInGymMembers || !isLinkedOnUser) {
    throw new AppError("User is not a member of this gym", 404);
  }

  return { gym, user };
};

const listGymMembers = async (gymId, query) => {
  const gym = await getGymOrThrow(gymId);
  const { page, limit, skip } = parsePagination(query);

  const filters = [
    { _id: { $in: gym.members } },
    { "gym.id": gym._id },
  ];

  if (query.search) {
    const searchRegex = new RegExp(escapeRegex(query.search.trim()), "i");
    filters.push({
      $or: [
        { name: searchRegex },
        { username: searchRegex },
        { email: searchRegex },
      ],
    });
  }

  if (query.status) {
    if (query.status === "Active") {
      filters.push({
        $or: [
          { "gymMembership.membershipStatus": "Active" },
          { "gymMembership.membershipStatus": { $exists: false } },
        ],
      });
    } else {
      filters.push({ "gymMembership.membershipStatus": query.status });
    }
  }

  if (query.membershipType) {
    filters.push({ "gymMembership.membershipType": query.membershipType });
  }

  const queryFilter = { $and: filters };

  const [members, total] = await Promise.all([
    User.find(queryFilter)
      .select("name username email image gym gymMembership")
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(queryFilter),
  ]);

  const rows = members.map(buildMembershipTableRow);

  return {
    members: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      hasNextPage: skip + rows.length < total,
      hasPreviousPage: page > 1,
    },
    filters: {
      search: query.search || null,
      status: query.status || null,
      membershipType: query.membershipType || null,
    },
    export: {
      columns: [
        "id",
        "name",
        "username",
        "email",
        "avatar",
        "membershipType",
        "membershipStatus",
        "membershipStartsAt",
        "membershipEndsAt",
      ],
      rowCount: rows.length,
      totalRows: total,
    },
  };
};

const updateGymMemberMembership = async (gymId, memberId, payload) => {
  const session = await mongoose.startSession();

  try {
    let updatedUser;

    await session.withTransaction(async () => {
      const { gym, user } = await ensureMemberBelongsToGym(gymId, memberId, session);
      const currentMembership = user.gymMembership || {};
      const previousMembershipObject = currentMembership.toObject?.() || { ...currentMembership };
      const membershipStartsAt = payload.membershipStartsAt
        ? new Date(payload.membershipStartsAt)
        : currentMembership.membershipStartsAt || currentMembership.joinedAt || new Date();
      const membershipEndsAt = payload.membershipEndsAt
        ? new Date(payload.membershipEndsAt)
        : payload.membershipEndsAt === null
          ? null
          : currentMembership.membershipEndsAt || null;

      if (membershipEndsAt && membershipStartsAt && membershipEndsAt < membershipStartsAt) {
        throw new AppError("membershipEndsAt must be after membershipStartsAt", 422);
      }

      const currentMembershipObject = currentMembership.toObject?.() || currentMembership;
      const nextMembership = {
        ...currentMembershipObject,
        gymId: gym._id,
        gymName: gym.name,
        membershipType: payload.membershipType ?? currentMembership.membershipType,
        membershipStatus: payload.membershipStatus ?? currentMembership.membershipStatus ?? "Active",
        membershipStartsAt,
        membershipEndsAt,
        joinedAt: currentMembership.joinedAt || membershipStartsAt,
      };

      user.gym = {
        id: gym._id,
        name: gym.name,
      };
      user.gymMembership = nextMembership;
      await user.save({ session });

      await Gym.updateOne(
        { _id: gym._id },
        { $addToSet: { members: user._id } },
        { session }
      );

      await maybeRecordMembershipRevenueUpdate({
        gym,
        userId: user._id,
        previousMembership: previousMembershipObject,
        nextMembership,
        occurredAt: new Date(),
        session,
      });

      updatedUser = user.toObject();
    });

    return {
      member: buildMembershipTableRow(updatedUser),
    };
  } finally {
    await session.endSession();
  }
};

const revokeGymMember = async (gymId, memberId, reason) => {
  const session = await mongoose.startSession();

  try {
    let revokedUser;

    await session.withTransaction(async () => {
      const { gym, user } = await ensureMemberBelongsToGym(gymId, memberId, session);
      const existingMembership = user.gymMembership?.toObject?.() || user.gymMembership || {};
      const revokedAt = new Date();
      const finalStatus =
        existingMembership.membershipEndsAt && existingMembership.membershipEndsAt < revokedAt
          ? "Expired"
          : "Revoked";

      user.gymMembershipHistory.push({
        ...existingMembership,
        gymId: gym._id,
        gymName: gym.name,
        membershipStatus: finalStatus,
        revokedAt,
        revokedReason: reason || null,
      });

      user.gym = {
        id: null,
        name: null,
      };
      user.gymMembership = {
        gymId: gym._id,
        gymName: gym.name,
        membershipType: existingMembership.membershipType || null,
        membershipStatus: finalStatus,
        membershipStartsAt: existingMembership.membershipStartsAt || existingMembership.joinedAt || null,
        membershipEndsAt: existingMembership.membershipEndsAt || revokedAt,
        joinedAt: existingMembership.joinedAt || existingMembership.membershipStartsAt || revokedAt,
        revokedAt,
        revokedReason: reason || null,
      };

      await maybeRecordRevocationRefund({
        gym,
        userId: user._id,
        membership: existingMembership,
        occurredAt: revokedAt,
        reason,
        session,
      });

      await user.save({ session });

      await Gym.updateOne(
        { _id: gym._id },
        { $pull: { members: user._id, trainers: user._id } },
        { session }
      );

      revokedUser = user.toObject();
    });

    return {
      member: buildMembershipTableRow(revokedUser),
    };
  } finally {
    await session.endSession();
  }
};

module.exports = {
  MEMBERSHIP_STATUSES,
  MEMBERSHIP_TYPES,
  listGymMembers,
  revokeGymMember,
  updateGymMemberMembership,
};
