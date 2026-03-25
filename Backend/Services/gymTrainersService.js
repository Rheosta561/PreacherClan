const mongoose = require("mongoose");
const Gym = require("../Models/GymSchema");
const User = require("../Models/User");
const GymTrainer = require("../Models/GymTrainer");
const { AppError } = require("./gymAuthService");

const parsePagination = ({ page = 1, limit = 10 }) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))];
};

const getGymOrThrow = async (gymId, session) => {
  const gym = await Gym.findById(gymId).select("_id name members trainers").session(session || null);
  if (!gym) {
    throw new AppError("Gym not found", 404);
  }

  return gym;
};

const buildAssignedMemberDto = (member) => ({
  id: member._id || member,
  name: member.name || null,
  username: member.username || null,
  image: member.image || null,
  email: member.email || null,
});

const buildTrainerDto = (mapping, trainerUser) => {
  const assignedMembers = Array.isArray(mapping.assignedMembers)
    ? mapping.assignedMembers.map(buildAssignedMemberDto)
    : [];

  return {
    id: mapping._id,
    trainerUserId: trainerUser?._id || mapping.trainerUserId,
    name: trainerUser?.name || null,
    username: trainerUser?.username || null,
    image: trainerUser?.image || null,
    email: trainerUser?.email || null,
    fee: mapping.fee || 0,
    tags: mapping.tags || [],
    assignedMembersCount: assignedMembers.length,
    assignedMembersPreview: assignedMembers.slice(0, 3),
    isActive: mapping.isActive,
    createdAt: mapping.createdAt,
    updatedAt: mapping.updatedAt,
  };
};

const buildTrainerDetailsDto = (mapping, trainerUser) => ({
  ...buildTrainerDto(mapping, trainerUser),
  assignedMembers: Array.isArray(mapping.assignedMembers)
    ? mapping.assignedMembers.map(buildAssignedMemberDto)
    : [],
});

const getTrainerMappingOrThrow = async (gymId, trainerId, session) => {
  const trainer = await GymTrainer.findOne({ _id: trainerId, gymId })
    .populate("trainerUserId", "name username email image")
    .populate("assignedMembers", "name username image")
    .session(session || null);

  if (!trainer) {
    throw new AppError("Trainer not found for this gym", 404);
  }

  return trainer;
};

const listGymTrainers = async (gymId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const gym = await getGymOrThrow(gymId);

  const filter = { gymId: gym._id };

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search.trim()), "i");
    const matchingUsers = await User.find({
      $or: [
        { name: regex },
        { username: regex },
      ],
    }).select("_id").lean();

    filter.trainerUserId = {
      $in: matchingUsers.map((user) => user._id),
    };
  }

  const [trainers, total] = await Promise.all([
    GymTrainer.find(filter)
      .populate({
        path: "trainerUserId",
        select: "name username email image",
      })
      .populate({
        path: "assignedMembers",
        select: "name username image",
        options: { limit: 3 },
      })
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit),
    GymTrainer.countDocuments(filter),
  ]);

  const rows = trainers.map((trainer) => buildTrainerDto(trainer, trainer.trainerUserId));

  return {
    trainers: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      hasNextPage: skip + rows.length < total,
      hasPreviousPage: page > 1,
    },
  };
};

const searchExistingUsersForTrainers = async (gymId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const gym = await getGymOrThrow(gymId);

  if (!query.search || !query.search.trim()) {
    return {
      users: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: page > 1,
      },
    };
  }

  const regex = new RegExp(escapeRegex(query.search.trim()), "i");
  const existingTrainerMappings = await GymTrainer.find({ gymId: gym._id }).select("trainerUserId").lean();
  const existingTrainerIds = existingTrainerMappings.map((item) => item.trainerUserId);

  const filter = {
    _id: { $nin: existingTrainerIds },
    $or: [
      { name: regex },
      { username: regex },
      { email: regex },
    ],
  };

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("name username email image role gym")
      .sort({ name: 1, username: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    users: users.map((user) => ({
      id: user._id,
      name: user.name || null,
      username: user.username || null,
      email: user.email || null,
      image: user.image || null,
      role: user.role || null,
      currentGym: user.gym?.id
        ? {
            id: user.gym.id,
            name: user.gym.name || null,
          }
        : null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      hasNextPage: skip + users.length < total,
      hasPreviousPage: page > 1,
    },
  };
};

const addTrainerToGym = async (gymId, payload) => {
  const session = await mongoose.startSession();

  try {
    let createdTrainer;

    await session.withTransaction(async () => {
      const gym = await getGymOrThrow(gymId, session);
      const trainerUser = await User.findById(payload.trainerUserId).session(session);
      if (!trainerUser) {
        throw new AppError("Trainer user does not exist", 404);
      }

      const exists = await GymTrainer.findOne({
        gymId: gym._id,
        trainerUserId: trainerUser._id,
      }).session(session);

      if (exists) {
        throw new AppError("Trainer already added to this gym", 409);
      }

      const trainer = await GymTrainer.create([{
        gymId: gym._id,
        trainerUserId: trainerUser._id,
        fee: payload.fee ?? 0,
        tags: normalizeTags(payload.tags),
        isActive: true,
        assignedMembers: [],
      }], { session });

      await Gym.updateOne(
        { _id: gym._id },
        { $addToSet: { trainers: trainerUser._id } },
        { session }
      );

      createdTrainer = trainer[0];
    });

    const hydratedTrainer = await GymTrainer.findById(createdTrainer._id)
      .populate("trainerUserId", "name username email image")
      .populate("assignedMembers", "name username email image");

    return {
      trainer: buildTrainerDetailsDto(hydratedTrainer, hydratedTrainer.trainerUserId),
    };
  } finally {
    await session.endSession();
  }
};

const getTrainerDetails = async (gymId, trainerId) => {
  const trainer = await getTrainerMappingOrThrow(gymId, trainerId);

  return {
    trainer: buildTrainerDetailsDto(trainer, trainer.trainerUserId),
  };
};

const updateTrainerDetails = async (gymId, trainerId, payload) => {
  const trainer = await getTrainerMappingOrThrow(gymId, trainerId);

  if (typeof payload.fee !== "undefined") {
    trainer.fee = payload.fee;
  }

  if (typeof payload.tags !== "undefined") {
    trainer.tags = normalizeTags(payload.tags);
  }

  if (typeof payload.isActive !== "undefined") {
    trainer.isActive = payload.isActive;
  }

  await trainer.save();
  await trainer.populate("trainerUserId", "name username email image");
  await trainer.populate("assignedMembers", "name username email image");

  return {
    trainer: buildTrainerDetailsDto(trainer, trainer.trainerUserId),
  };
};

const removeTrainerFromGym = async (gymId, trainerId) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const trainer = await GymTrainer.findOne({ _id: trainerId, gymId }).session(session);
      if (!trainer) {
        throw new AppError("Trainer not found for this gym", 404);
      }

      await Gym.updateOne(
        { _id: gymId },
        { $pull: { trainers: trainer.trainerUserId } },
        { session }
      );

      await GymTrainer.deleteOne({ _id: trainer._id, gymId }, { session });
    });
  } finally {
    await session.endSession();
  }
};

const assignTrainerToMember = async (gymId, trainerId, memberUserId) => {
  const session = await mongoose.startSession();

  try {
    let updatedTrainer;

    await session.withTransaction(async () => {
      const gym = await getGymOrThrow(gymId, session);
      const trainer = await GymTrainer.findOne({ _id: trainerId, gymId }).session(session);
      if (!trainer) {
        throw new AppError("Trainer not found for this gym", 404);
      }

      const member = await User.findById(memberUserId).session(session);
      if (!member) {
        throw new AppError("Member not found", 404);
      }

      const isGymMember = gym.members.some((id) => id.toString() === String(memberUserId));
      const userBelongsToGym = String(member.gym?.id || "") === String(gymId);
      if (!isGymMember || !userBelongsToGym) {
        throw new AppError("User is not a member of this gym", 404);
      }

      trainer.assignedMembers = trainer.assignedMembers || [];
      if (!trainer.assignedMembers.some((id) => id.toString() === String(memberUserId))) {
        trainer.assignedMembers.push(member._id);
        await trainer.save({ session });
      }

      updatedTrainer = trainer._id;
    });

    return getTrainerDetails(gymId, updatedTrainer);
  } finally {
    await session.endSession();
  }
};

const unassignTrainerFromMember = async (gymId, trainerId, memberUserId) => {
  const trainer = await GymTrainer.findOne({ _id: trainerId, gymId });
  if (!trainer) {
    throw new AppError("Trainer not found for this gym", 404);
  }

  trainer.assignedMembers = (trainer.assignedMembers || []).filter(
    (id) => id.toString() !== String(memberUserId)
  );
  await trainer.save();

  return getTrainerDetails(gymId, trainer._id);
};

module.exports = {
  addTrainerToGym,
  assignTrainerToMember,
  getTrainerDetails,
  listGymTrainers,
  removeTrainerFromGym,
  searchExistingUsersForTrainers,
  unassignTrainerFromMember,
  updateTrainerDetails,
};
