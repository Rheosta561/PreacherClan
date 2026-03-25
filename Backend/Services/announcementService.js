const Announcement = require("../Models/Announcement");
const Gym = require("../Models/GymSchema");
const GymTrainer = require("../Models/GymTrainer");
const Notification = require("../Models/Notification");
const User = require("../Models/User");
const { onlineUsers, getIo } = require("../socket");
const { AppError } = require("./gymAuthService");
const { sendPushNotification } = require("./pushService");
const { sendAnnouncementEmail } = require("./mailService");

const ANNOUNCEMENT_CATEGORIES = ["Facility", "Events", "Policy", "Offer", "Maintenance"];
const ANNOUNCEMENT_AUDIENCES = ["All Members", "Trainers", "Staff"];
const ANNOUNCEMENT_STATUSES = ["Draft", "Sent", "Failed"];

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

const getGymOrThrow = async (gymId) => {
  const gym = await Gym.findById(gymId).select("_id name members trainers owner");
  if (!gym) {
    throw new AppError("Gym not found", 404);
  }

  return gym;
};

const formatAnnouncementDto = (announcement) => ({
  id: announcement._id,
  title: announcement.title,
  message: announcement.message,
  category: announcement.category,
  audience: announcement.audience,
  deliveryChannels: announcement.deliveryChannels,
  deliveryStatus: announcement.deliveryStatus,
  status: announcement.status,
  sentAt: announcement.sentAt,
  subjectLine: announcement.subjectLine || null,
  targetUserCount: announcement.targetUserCount || 0,
  failedRecipients: announcement.failedRecipients || [],
  createdAt: announcement.createdAt,
  updatedAt: announcement.updatedAt,
});

const buildAnnouncementEmailHtml = ({ gymName, title, message, category }) => `
  <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; background: #ffffff; color: #111827;">
    <div style="padding: 20px; border-radius: 12px; background: #111827; color: #ffffff; margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px;">${gymName} Announcement</h2>
      <p style="margin: 0; opacity: 0.8;">Category: ${category}</p>
    </div>
    <h3 style="margin: 0 0 12px;">${title}</h3>
    <p style="line-height: 1.6; margin: 0 0 16px;">${message}</p>
    <p style="margin: 24px 0 0; color: #6B7280; font-size: 14px;">Sent from the Preacher Clan gym dashboard.</p>
  </div>
`;

const resolveAudienceUsers = async (gym, audience) => {
  if (audience === "All Members") {
    return User.find({
      _id: { $in: gym.members || [] },
      "gym.id": gym._id,
    }).select("name username email pushToken image").lean();
  }

  if (audience === "Trainers") {
    const gymTrainers = await GymTrainer.find({
      gymId: gym._id,
      isActive: true,
    }).select("trainerUserId").lean();

    const trainerIds = gymTrainers.map((item) => item.trainerUserId);
    return User.find({
      _id: { $in: trainerIds },
    }).select("name username email pushToken image").lean();
  }

  if (audience === "Staff") {
    if (!gym.owner) {
      return [];
    }

    return User.find({
      _id: gym.owner,
    }).select("name username email pushToken image").lean();
  }

  return [];
};

const createBaseAnnouncement = async (gymId, payload) => {
  return Announcement.create({
    gymId,
    title: payload.title,
    message: payload.message,
    category: payload.category,
    audience: payload.audience,
    deliveryChannels: payload.deliveryChannels,
    deliveryStatus: {
      push: { attempted: 0, sent: 0, failed: 0 },
      email: { attempted: 0, sent: 0, failed: 0 },
      socket: { attempted: 0, sent: 0, failed: 0 },
    },
    status: "Sent",
    sentAt: new Date(),
    subjectLine: payload.subjectLine || payload.title,
    targetUserCount: 0,
    failedRecipients: [],
    metadata: payload.metadata || {},
    createdBy: {
      actorType: "gym",
      actorId: gymId,
    },
  });
};

const deliverAnnouncement = async ({ announcement, gym, recipients }) => {
  const io = getIo();
  const deliveryStatus = {
    push: { attempted: 0, sent: 0, failed: 0 },
    email: { attempted: 0, sent: 0, failed: 0 },
    socket: { attempted: 0, sent: 0, failed: 0 },
  };
  const failedRecipients = [];

  const notificationDocs = recipients.map((user) => ({
    userId: user._id,
    message: announcement.message,
    type: "info",
  }));

  if (notificationDocs.length) {
    await Notification.insertMany(notificationDocs, { ordered: false }).catch(() => []);
  }

  for (const user of recipients) {
    const socketId = onlineUsers.get(user._id.toString());
    if (socketId && io) {
      deliveryStatus.socket.attempted += 1;
      try {
        io.to(socketId).emit("gymAnnouncement", {
          announcementId: announcement._id,
          gymId: gym._id,
          title: announcement.title,
          message: announcement.message,
          category: announcement.category,
          audience: announcement.audience,
          createdAt: announcement.createdAt,
        });
        io.to(socketId).emit("notification", {
          userId: user._id,
          message: announcement.message,
          type: "info",
          createdAt: new Date(),
        });
        deliveryStatus.socket.sent += 1;
      } catch (error) {
        deliveryStatus.socket.failed += 1;
        failedRecipients.push({
          userId: user._id,
          channel: "socket",
          reason: error.message || "Socket emit failed",
        });
      }
    }

    if (announcement.deliveryChannels.push) {
      const pushResult = await sendPushNotification({
        user,
        title: announcement.title,
        body: announcement.message,
        data: {
          type: "GYM_ANNOUNCEMENT",
          announcementId: announcement._id.toString(),
          gymId: gym._id.toString(),
        },
      });

      if (pushResult.attempted) {
        deliveryStatus.push.attempted += 1;
      }

      if (pushResult.sent) {
        deliveryStatus.push.sent += 1;
      } else if (pushResult.attempted) {
        deliveryStatus.push.failed += 1;
        failedRecipients.push({
          userId: user._id,
          channel: "push",
          reason: pushResult.reason || "Push send failed",
        });
      }
    }

    if (announcement.deliveryChannels.email) {
      const emailResult = await sendAnnouncementEmail({
        to: user.email,
        subject: announcement.subjectLine || announcement.title,
        html: buildAnnouncementEmailHtml({
          gymName: gym.name,
          title: announcement.title,
          message: announcement.message,
          category: announcement.category,
        }),
      });

      if (emailResult.attempted) {
        deliveryStatus.email.attempted += 1;
      }

      if (emailResult.sent) {
        deliveryStatus.email.sent += 1;
      } else if (emailResult.attempted) {
        deliveryStatus.email.failed += 1;
        failedRecipients.push({
          userId: user._id,
          channel: "email",
          reason: emailResult.reason || "Email send failed",
        });
      }
    }
  }

  announcement.deliveryStatus = deliveryStatus;
  announcement.failedRecipients = failedRecipients;
  announcement.targetUserCount = recipients.length;

  const pushAttempted = !announcement.deliveryChannels.push || deliveryStatus.push.attempted > 0;
  const emailAttempted = !announcement.deliveryChannels.email || deliveryStatus.email.attempted > 0;
  const anySuccess =
    deliveryStatus.push.sent > 0 ||
    deliveryStatus.email.sent > 0 ||
    deliveryStatus.socket.sent > 0;

  announcement.status = anySuccess || (!pushAttempted && !emailAttempted) ? "Sent" : "Failed";
  announcement.sentAt = new Date();
  await announcement.save();

  return announcement;
};

const createAndSendAnnouncement = async (gymId, payload) => {
  const gym = await getGymOrThrow(gymId);
  const recipients = await resolveAudienceUsers(gym, payload.audience);
  const announcement = await createBaseAnnouncement(gymId, payload);
  const deliveredAnnouncement = await deliverAnnouncement({
    announcement,
    gym,
    recipients,
  });

  return {
    item: formatAnnouncementDto(deliveredAnnouncement),
  };
};

const listAnnouncements = async (gymId, query) => {
  await getGymOrThrow(gymId);
  const { page, limit, skip } = parsePagination(query);
  const sortBy = ["createdAt", "updatedAt", "sentAt", "status", "category", "audience"].includes(query.sortBy)
    ? query.sortBy
    : "createdAt";
  const sortOrder = query.sortOrder === "asc" ? 1 : -1;

  const filter = { gymId };
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search.trim()), "i");
    filter.$or = [
      { title: regex },
      { message: regex },
    ];
  }

  if (query.category) {
    filter.category = query.category;
  }

  if (query.audience) {
    filter.audience = query.audience;
  }

  if (query.status) {
    filter.status = query.status;
  }

  const [items, totalItems] = await Promise.all([
    Announcement.find(filter)
      .sort({ [sortBy]: sortOrder, _id: -1 })
      .skip(skip)
      .limit(limit),
    Announcement.countDocuments(filter),
  ]);

  return {
    items: items.map(formatAnnouncementDto),
    page,
    limit,
    totalItems,
    totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
  };
};

const getAnnouncementDetails = async (gymId, announcementId) => {
  const item = await Announcement.findOne({ _id: announcementId, gymId });
  if (!item) {
    throw new AppError("Announcement not found for this gym", 404);
  }

  return {
    item: formatAnnouncementDto(item),
  };
};

module.exports = {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_STATUSES,
  createAndSendAnnouncement,
  getAnnouncementDetails,
  listAnnouncements,
};
