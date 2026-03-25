const mongoose = require("mongoose");
const EntryLog = require("../Models/EntryLog");
const Gym = require("../Models/GymSchema");
const User = require("../Models/User");
const { AppError } = require("./gymAuthService");

const APP_TIME_ZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";
const APP_TIME_OFFSET = process.env.APP_TIME_OFFSET || "+05:30";

const WINDOW_RANGES = {
  all: { startMinutes: 0, endMinutes: 1439 },
  morning: { startMinutes: 360, endMinutes: 719 },
  afternoon: { startMinutes: 720, endMinutes: 1019 },
  evening: { startMinutes: 1020, endMinutes: 1319 },
  night: { startMinutes: 1320, endMinutes: 359 },
};

const WEEKDAY_MAP = {
  sunday: 1,
  monday: 2,
  tuesday: 3,
  wednesday: 4,
  thursday: 5,
  friday: 6,
  saturday: 7,
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

const getDateKey = (date = new Date()) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const getWeekdayName = (date) => {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
  }).format(date);
};

const getTimeLabel = (date) => {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

const toLocalDateRange = (dateString) => {
  const start = new Date(`${dateString}T00:00:00${APP_TIME_OFFSET}`);
  const end = new Date(`${dateString}T23:59:59.999${APP_TIME_OFFSET}`);
  return { start, end };
};

const parseTimeToMinutes = (timeString) => {
  const [hours, minutes] = String(timeString).split(":").map(Number);
  return (hours * 60) + minutes;
};

const deriveStatus = (actionType, status) => {
  if (status) {
    return status;
  }

  return actionType === "check_out" ? "Checked Out" : "Checked In";
};

const getGymAndMemberOrThrow = async (gymId, memberUserId, session) => {
  const gym = await Gym.findById(gymId).select("_id name gymCode members").session(session || null);
  if (!gym) {
    throw new AppError("Gym not found", 404);
  }

  const member = await User.findById(memberUserId).session(session || null);
  if (!member) {
    throw new AppError("Member not found", 404);
  }

  const isGymMember = gym.members.some((id) => id.toString() === String(memberUserId));
  const userBelongsToGym = String(member.gym?.id || "") === String(gymId);

  if (!isGymMember || !userBelongsToGym) {
    throw new AppError("User is not a member of this gym", 404);
  }

  return { gym, member };
};

const createEntryLog = async ({
  gymId,
  memberUserId,
  actionType,
  source,
  status,
  occurredAt,
  notes,
  createdBy,
}) => {
  const { gym, member } = await getGymAndMemberOrThrow(gymId, memberUserId);
  const finalOccurredAt = occurredAt ? new Date(occurredAt) : new Date();

  const entryLog = await EntryLog.create({
    gymId: gym._id,
    memberUserId: member._id,
    memberNameSnapshot: member.name || member.username || "Unknown",
    memberUsernameSnapshot: member.username || null,
    memberImageSnapshot: member.image || null,
    membershipTypeSnapshot: member.gymMembership?.membershipType || null,
    actionType,
    status: deriveStatus(actionType, status),
    source,
    occurredAt: finalOccurredAt,
    notes: notes || null,
    createdBy: createdBy || {
      actorType: "gym",
      actorId: gym._id,
    },
  });

  return entryLog;
};

const buildTimeRangeExpr = (startTime, endTime) => {
  if (!startTime && !endTime) {
    return null;
  }

  const timeInMinutes = {
    $add: [
      {
        $multiply: [
          { $hour: { date: "$occurredAt", timezone: APP_TIME_ZONE } },
          60,
        ],
      },
      { $minute: { date: "$occurredAt", timezone: APP_TIME_ZONE } },
    ],
  };

  const comparisons = [];

  if (startTime) {
    comparisons.push({ $gte: [timeInMinutes, parseTimeToMinutes(startTime)] });
  }

  if (endTime) {
    comparisons.push({ $lte: [timeInMinutes, parseTimeToMinutes(endTime)] });
  }

  return comparisons.length === 1 ? comparisons[0] : { $and: comparisons };
};

const buildEntryLogAggregation = (gymId, query) => {
  const match = {
    gymId: new mongoose.Types.ObjectId(gymId),
  };

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search.trim()), "i");
    match.$or = [
      { memberNameSnapshot: regex },
      { memberUsernameSnapshot: regex },
    ];
  }

  if (query.status) {
    match.status = query.status;
  }

  if (query.source) {
    match.source = query.source;
  }

  if (query.date) {
    const { start, end } = toLocalDateRange(query.date);
    match.occurredAt = { ...(match.occurredAt || {}), $gte: start, $lte: end };
  }

  const andExpr = [];

  if (query.day) {
    const weekdayNumber = WEEKDAY_MAP[String(query.day).toLowerCase()];
    if (weekdayNumber) {
      andExpr.push({
        $eq: [
          { $dayOfWeek: { date: "$occurredAt", timezone: APP_TIME_ZONE } },
          weekdayNumber,
        ],
      });
    }
  }

  const timeRangeExpr = buildTimeRangeExpr(query.startTime, query.endTime);
  if (timeRangeExpr) {
    andExpr.push(timeRangeExpr);
  }

  const pipeline = [{ $match: match }];

  if (andExpr.length) {
    pipeline.push({
      $match: {
        $expr: andExpr.length === 1 ? andExpr[0] : { $and: andExpr },
      },
    });
  }

  return pipeline;
};

const entryLogProjection = {
  _id: 1,
  memberUserId: 1,
  member: {
    id: "$memberUserId",
    name: "$memberNameSnapshot",
    username: "$memberUsernameSnapshot",
    image: "$memberImageSnapshot",
  },
  membership: "$membershipTypeSnapshot",
  source: 1,
  status: 1,
  actionType: 1,
  occurredAt: 1,
  notes: 1,
  date: {
    $dateToString: {
      format: "%Y-%m-%d",
      date: "$occurredAt",
      timezone: APP_TIME_ZONE,
    },
  },
  time: {
    $dateToString: {
      format: "%H:%M",
      date: "$occurredAt",
      timezone: APP_TIME_ZONE,
    },
  },
  hourBucket: {
    $dateToString: {
      format: "%H:00",
      date: "$occurredAt",
      timezone: APP_TIME_ZONE,
    },
  },
  dayOfWeek: {
    $dayOfWeek: {
      date: "$occurredAt",
      timezone: APP_TIME_ZONE,
    },
  },
};

const dayNumberToName = {
  1: "Sunday",
  2: "Monday",
  3: "Tuesday",
  4: "Wednesday",
  5: "Thursday",
  6: "Friday",
  7: "Saturday",
};

const mapEntryLogRow = (row) => ({
  id: row._id,
  memberUserId: row.memberUserId,
  member: row.member,
  membership: row.membership || null,
  date: row.date,
  day: dayNumberToName[row.dayOfWeek] || null,
  time: row.time,
  source: row.source,
  status: row.status,
  actionType: row.actionType,
  notes: row.notes || null,
});

const listEntryLogs = async (gymId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const sortBy = ["occurredAt", "status", "source"].includes(query.sortBy) ? query.sortBy : "occurredAt";
  const sortOrder = query.sortOrder === "asc" ? 1 : -1;

  const basePipeline = buildEntryLogAggregation(gymId, query);

  const [rows, totalCountResult] = await Promise.all([
    EntryLog.aggregate([
      ...basePipeline,
      { $sort: { [sortBy]: sortOrder, _id: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: entryLogProjection },
    ]),
    EntryLog.aggregate([
      ...basePipeline,
      { $count: "total" },
    ]),
  ]);

  const total = totalCountResult[0]?.total || 0;
  const data = rows.map(mapEntryLogRow);

  return {
    logs: data,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      hasNextPage: skip + data.length < total,
      hasPreviousPage: page > 1,
    },
  };
};

const exportEntryLogs = async (gymId, query) => {
  const rows = await EntryLog.aggregate([
    ...buildEntryLogAggregation(gymId, query),
    { $sort: { occurredAt: -1, _id: -1 } },
    { $project: entryLogProjection },
  ]);

  const data = rows.map(mapEntryLogRow);

  return {
    columns: ["id", "memberUserId", "member", "membership", "date", "day", "time", "source", "status"],
    count: data.length,
    rows: data,
  };
};

const getAnalyticsByTime = async (gymId, { date, window = "all" }) => {
  if (!date) {
    throw new AppError("date is required", 422);
  }

  const selectedWindow = WINDOW_RANGES[window] ? window : "all";
  const { start, end } = toLocalDateRange(date);
  const { startMinutes, endMinutes } = WINDOW_RANGES[selectedWindow];

  const timeInMinutes = {
    $add: [
      {
        $multiply: [
          { $hour: { date: "$occurredAt", timezone: APP_TIME_ZONE } },
          60,
        ],
      },
      { $minute: { date: "$occurredAt", timezone: APP_TIME_ZONE } },
    ],
  };

  const windowExpr = selectedWindow === "night"
    ? {
        $or: [
          { $gte: [timeInMinutes, startMinutes] },
          { $lte: [timeInMinutes, endMinutes] },
        ],
      }
    : {
        $and: [
          { $gte: [timeInMinutes, startMinutes] },
          { $lte: [timeInMinutes, endMinutes] },
        ],
      };

  const rows = await EntryLog.aggregate([
    {
      $match: {
        gymId: new mongoose.Types.ObjectId(gymId),
        actionType: "check_in",
        occurredAt: { $gte: start, $lte: end },
      },
    },
    {
      $match: {
        $expr: windowExpr,
      },
    },
    {
      $group: {
        _id: {
          hour: {
            $hour: { date: "$occurredAt", timezone: APP_TIME_ZONE },
          },
        },
        entries: { $sum: 1 },
      },
    },
    {
      $sort: {
        "_id.hour": 1,
      },
    },
  ]);

  const points = rows.map((row) => ({
    timeLabel: `${String(row._id.hour).padStart(2, "0")}:00`,
    entries: row.entries,
  }));

  return {
    date,
    window: selectedWindow,
    points,
  };
};

module.exports = {
  APP_TIME_ZONE,
  createEntryLog,
  exportEntryLogs,
  getAnalyticsByTime,
  getDateKey,
  getWeekdayName,
  getTimeLabel,
  listEntryLogs,
};
