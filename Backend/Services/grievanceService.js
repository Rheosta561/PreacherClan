const Grievance = require("../Models/Grievance");
const Gym = require("../Models/GymSchema");
const User = require("../Models/User");
const { AppError } = require("./gymAuthService");
const { sendAnnouncementEmail } = require("./mailService");

const GRIEVANCE_TYPES = ["Billing", "Facility", "Staff", "Safety", "Other"];
const GRIEVANCE_STATUSES = ["Open", "In Review", "Resolved", "Closed"];
const GRIEVANCE_PRIORITIES = ["Low", "Medium", "High"];
const INTERNAL_SECRET_HEADER = "x-internal-secret";

const STATUS_TRANSITIONS = {
  Open: ["In Review", "Resolved", "Closed"],
  "In Review": ["Resolved", "Closed"],
  Resolved: ["Closed"],
  Closed: [],
};

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

const formatGrievanceDto = (item) => ({
  id: item._id,
  memberId: item.userId?._id || item.userId,
  memberName: item.userId?.name || null,
  memberUsername: item.userId?.username || null,
  subject: item.subject,
  description: item.description,
  type: item.type,
  priority: item.priority,
  status: item.status,
  attachments: item.attachments || [],
  notesByGym: item.notesByGym || null,
  reminderMeta: item.reminderMeta || { lastReminderSentAt: null, reminderCount: 0 },
  resolvedAt: item.resolvedAt || null,
  closedAt: item.closedAt || null,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const getGymOrThrow = async (gymId) => {
  const gym = await Gym.findById(gymId).select("_id name members owner contact");
  if (!gym) {
    throw new AppError("Gym not found", 404);
  }

  return gym;
};

const getUserOrThrow = async (userId) => {
  const user = await User.findById(userId).select("_id name username email gym");
  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

const ensureUserBelongsToGym = async (userId, gymId) => {
  const [user, gym] = await Promise.all([
    getUserOrThrow(userId),
    getGymOrThrow(gymId),
  ]);

  const isGymMember = gym.members.some((id) => id.toString() === String(userId));
  const userBelongsToGym = String(user.gym?.id || "") === String(gymId);

  if (!isGymMember || !userBelongsToGym) {
    throw new AppError("Only gym members can raise grievances for this gym", 403);
  }

  return { user, gym };
};

const getGrievanceOrThrow = async (grievanceId) => {
  const item = await Grievance.findById(grievanceId)
    .populate("userId", "name username email")
    .populate("gymId", "_id name owner contact");

  if (!item) {
    throw new AppError("Grievance not found", 404);
  }

  return item;
};

const createGrievance = async (userId, payload) => {
  await ensureUserBelongsToGym(userId, payload.gymId);

  const item = await Grievance.create({
    userId,
    gymId: payload.gymId,
    subject: payload.subject,
    description: payload.description,
    type: payload.type,
    priority: payload.priority || "Medium",
    attachments: payload.attachments || [],
    status: "Open",
  });

  const populated = await Grievance.findById(item._id)
    .populate("userId", "name username email")
    .populate("gymId", "_id");

  return {
    item: formatGrievanceDto(populated),
  };
};

const listOwnGrievances = async (userId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = { userId };

  if (query.status) {
    filter.status = query.status;
  }

  const [items, totalItems] = await Promise.all([
    Grievance.find(filter)
      .populate("userId", "name username email")
      .populate("gymId", "_id name")
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit),
    Grievance.countDocuments(filter),
  ]);

  return {
    items: items.map(formatGrievanceDto),
    page,
    limit,
    totalItems,
    totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
  };
};

const getGrievanceDetailsForUserOrGym = async ({ grievanceId, userId, gymId }) => {
  const item = await getGrievanceOrThrow(grievanceId);

  const ownedByUser = userId && String(item.userId._id) === String(userId);
  const ownedByGym = gymId && String(item.gymId._id) === String(gymId);

  if (!ownedByUser && !ownedByGym) {
    throw new AppError("You are not allowed to access this grievance", 403);
  }

  return {
    item: formatGrievanceDto(item),
  };
};

const updateOwnGrievance = async (userId, grievanceId, payload) => {
  const item = await Grievance.findById(grievanceId);
  if (!item) {
    throw new AppError("Grievance not found", 404);
  }

  if (String(item.userId) !== String(userId)) {
    throw new AppError("You can only update your own grievance", 403);
  }

  if (item.status !== "Open") {
    throw new AppError("Only open grievances can be updated by the member", 422);
  }

  if (typeof payload.subject !== "undefined") {
    item.subject = payload.subject;
  }

  if (typeof payload.description !== "undefined") {
    item.description = payload.description;
  }

  if (typeof payload.type !== "undefined") {
    item.type = payload.type;
  }

  if (typeof payload.priority !== "undefined") {
    item.priority = payload.priority;
  }

  if (typeof payload.attachments !== "undefined") {
    item.attachments = payload.attachments;
  }

  await item.save();
  const populated = await getGrievanceOrThrow(item._id);

  return {
    item: formatGrievanceDto(populated),
  };
};

const deleteOwnGrievance = async (userId, grievanceId) => {
  const item = await Grievance.findById(grievanceId);
  if (!item) {
    throw new AppError("Grievance not found", 404);
  }

  if (String(item.userId) !== String(userId)) {
    throw new AppError("You can only delete your own grievance", 403);
  }

  if (item.status !== "Open") {
    throw new AppError("Only open grievances can be deleted by the member", 422);
  }

  await Grievance.deleteOne({ _id: item._id });
};

const listGymGrievances = async (gymId, query) => {
  await getGymOrThrow(gymId);
  const { page, limit, skip } = parsePagination(query);
  const sortBy = ["createdAt", "updatedAt", "status", "priority", "type"].includes(query.sortBy)
    ? query.sortBy
    : "createdAt";
  const sortOrder = query.sortOrder === "asc" ? 1 : -1;

  const filter = { gymId };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.type) {
    filter.type = query.type;
  }

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search.trim()), "i");
    const matchingUsers = await User.find({
      $or: [
        { name: regex },
        { username: regex },
      ],
    }).select("_id").lean();

    filter.$or = [
      { subject: regex },
      { description: regex },
      { type: regex },
      { userId: { $in: matchingUsers.map((user) => user._id) } },
    ];
  }

  const [items, totalItems] = await Promise.all([
    Grievance.find(filter)
      .populate("userId", "name username email")
      .populate("gymId", "_id name")
      .sort({ [sortBy]: sortOrder, _id: -1 })
      .skip(skip)
      .limit(limit),
    Grievance.countDocuments(filter),
  ]);

  return {
    items: items.map(formatGrievanceDto),
    page,
    limit,
    totalItems,
    totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
  };
};

const updateGymGrievanceStatus = async (gymId, grievanceId, status) => {
  const item = await Grievance.findById(grievanceId);
  if (!item) {
    throw new AppError("Grievance not found", 404);
  }

  if (String(item.gymId) !== String(gymId)) {
    throw new AppError("This grievance does not belong to your gym", 403);
  }

  if (item.status === status) {
    const populatedSame = await getGrievanceOrThrow(item._id);
    return { item: formatGrievanceDto(populatedSame) };
  }

  const allowedTransitions = STATUS_TRANSITIONS[item.status] || [];
  if (!allowedTransitions.includes(status)) {
    throw new AppError(`Cannot change status from ${item.status} to ${status}`, 422);
  }

  item.status = status;
  if (status === "Resolved") {
    item.resolvedAt = new Date();
  }
  if (status === "Closed") {
    item.closedAt = new Date();
  }

  await item.save();
  const populated = await getGrievanceOrThrow(item._id);

  return {
    item: formatGrievanceDto(populated),
  };
};

const updateGymGrievance = async (gymId, grievanceId, payload) => {
  const item = await Grievance.findById(grievanceId);
  if (!item) {
    throw new AppError("Grievance not found", 404);
  }

  if (String(item.gymId) !== String(gymId)) {
    throw new AppError("This grievance does not belong to your gym", 403);
  }

  if (typeof payload.notesByGym !== "undefined") {
    item.notesByGym = payload.notesByGym;
  }

  if (typeof payload.priority !== "undefined") {
    item.priority = payload.priority;
  }

  await item.save();
  const populated = await getGrievanceOrThrow(item._id);

  return {
    item: formatGrievanceDto(populated),
  };
};

const getReminderRecipient = async (gym) => {
  if (gym.contact?.email) {
    return gym.contact.email;
  }

  if (gym.owner) {
    const owner = await User.findById(gym.owner).select("email");
    if (owner?.email) {
      return owner.email;
    }
  }

  return null;
};

const buildReminderEmailHtml = ({ gymName, grievances }) => `
  <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 24px; color: #111827;">
    <h2 style="margin: 0 0 16px;">Unresolved grievance reminder for ${gymName}</h2>
    <p style="margin: 0 0 20px;">The following grievances are still unresolved and need attention:</p>
    <ul>
      ${grievances.map((item) => `
        <li style="margin-bottom: 16px;">
          <strong>${item.subject}</strong><br />
          Type: ${item.type}<br />
          Member: ${item.userId?.name || "Unknown"}<br />
          Status: ${item.status}<br />
          Created At: ${item.createdAt.toISOString()}
        </li>
      `).join("")}
    </ul>
  </div>
`;

const sendUnresolvedGrievanceReminders = async () => {
  const thresholdHours = Number(process.env.GRIEVANCE_REMINDER_THRESHOLD_HOURS || 24);
  const recentReminderBlockHours = Number(process.env.GRIEVANCE_REMINDER_COOLDOWN_HOURS || 24);
  const now = new Date();
  const unresolvedBefore = new Date(now.getTime() - (thresholdHours * 60 * 60 * 1000));
  const remindedAfter = new Date(now.getTime() - (recentReminderBlockHours * 60 * 60 * 1000));

  const gyms = await Gym.find({
    $or: [
      { "contact.email": { $exists: true, $ne: null } },
      { owner: { $exists: true, $ne: null } },
    ],
  }).select("_id name owner contact");

  const results = [];

  for (const gym of gyms) {
    const grievances = await Grievance.find({
      gymId: gym._id,
      status: { $in: ["Open", "In Review"] },
      createdAt: { $lte: unresolvedBefore },
      $or: [
        { "reminderMeta.lastReminderSentAt": null },
        { "reminderMeta.lastReminderSentAt": { $lte: remindedAfter } },
      ],
    }).populate("userId", "name username email");

    if (!grievances.length) {
      continue;
    }

    const recipientEmail = await getReminderRecipient(gym);
    if (!recipientEmail) {
      results.push({
        gymId: gym._id,
        sent: false,
        count: grievances.length,
        reason: "No recipient email configured",
      });
      continue;
    }

    const emailResult = await sendAnnouncementEmail({
      to: recipientEmail,
      subject: `Unresolved grievance reminder for ${gym.name}`,
      html: buildReminderEmailHtml({
        gymName: gym.name,
        grievances,
      }),
    });

    if (emailResult.sent) {
      await Grievance.updateMany(
        { _id: { $in: grievances.map((item) => item._id) } },
        {
          $set: { "reminderMeta.lastReminderSentAt": now },
          $inc: { "reminderMeta.reminderCount": 1 },
        }
      );
    }

    results.push({
      gymId: gym._id,
      sent: emailResult.sent,
      count: grievances.length,
      recipientEmail,
      reason: emailResult.reason || null,
    });
  }

  return {
    processedAt: now,
    gymsProcessed: results.length,
    results,
  };
};

const verifyInternalReminderSecret = (providedSecret) => {
  const expectedSecret = process.env.GRIEVANCE_REMINDER_SECRET;
  if (!expectedSecret || providedSecret !== expectedSecret) {
    throw new AppError("Unauthorized internal request", 401);
  }
};

module.exports = {
  GRIEVANCE_PRIORITIES,
  GRIEVANCE_STATUSES,
  GRIEVANCE_TYPES,
  INTERNAL_SECRET_HEADER,
  createGrievance,
  deleteOwnGrievance,
  getGrievanceDetailsForUserOrGym,
  listGymGrievances,
  listOwnGrievances,
  sendUnresolvedGrievanceReminders,
  updateGymGrievance,
  updateGymGrievanceStatus,
  updateOwnGrievance,
  verifyInternalReminderSecret,
};
