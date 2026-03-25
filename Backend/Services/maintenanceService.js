const mongoose = require("mongoose");
const Maintenance = require("../Models/Maintenance");
const Gym = require("../Models/GymSchema");
const { AppError } = require("./gymAuthService");

const APP_TIME_ZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";
const APP_TIME_OFFSET = process.env.APP_TIME_OFFSET || "+05:30";
const MAINTENANCE_CATEGORIES = ["Equipment", "Facility", "Safety", "Cleaning"];
const MAINTENANCE_STATUSES = ["Scheduled", "In Progress", "Completed", "Cancelled"];

const STATUS_TRANSITIONS = {
  Scheduled: ["In Progress", "Cancelled", "Completed"],
  "In Progress": ["Completed", "Cancelled"],
  Completed: [],
  Cancelled: [],
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

const toLocalDateRange = (dateString) => {
  const start = new Date(`${dateString}T00:00:00${APP_TIME_OFFSET}`);
  const end = new Date(`${dateString}T23:59:59.999${APP_TIME_OFFSET}`);
  return { start, end };
};

const getGymOrThrow = async (gymId) => {
  const gym = await Gym.findById(gymId).select("_id");
  if (!gym) {
    throw new AppError("Gym not found", 404);
  }

  return gym;
};

const formatDate = (date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const formatTime = (date) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);

const toMaintenanceDto = (item) => ({
  id: item._id,
  title: item.title,
  description: item.description,
  category: item.category,
  scheduledAt: item.scheduledAt,
  date: formatDate(item.scheduledAt),
  time: formatTime(item.scheduledAt),
  status: item.status,
  notes: item.notes || null,
  completedAt: item.completedAt || null,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const getMaintenanceOrThrow = async (gymId, maintenanceId) => {
  const item = await Maintenance.findOne({ _id: maintenanceId, gymId });
  if (!item) {
    throw new AppError("Maintenance task not found for this gym", 404);
  }

  return item;
};

const createMaintenance = async (gymId, payload) => {
  await getGymOrThrow(gymId);

  const item = await Maintenance.create({
    gymId,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    scheduledAt: new Date(payload.scheduledAt),
    status: payload.status || "Scheduled",
    notes: payload.notes || null,
    createdBy: {
      actorType: "gym",
      actorId: gymId,
    },
    completedAt: payload.status === "Completed" ? new Date() : null,
  });

  return {
    item: toMaintenanceDto(item),
  };
};

const listMaintenance = async (gymId, query) => {
  await getGymOrThrow(gymId);
  const { page, limit, skip } = parsePagination(query);
  const sortBy = ["scheduledAt", "createdAt", "updatedAt", "status", "category"].includes(query.sortBy)
    ? query.sortBy
    : "scheduledAt";
  const sortOrder = query.sortOrder === "asc" ? 1 : -1;

  const filter = { gymId: new mongoose.Types.ObjectId(gymId) };

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search.trim()), "i");
    filter.$or = [
      { title: regex },
      { description: regex },
    ];
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.category) {
    filter.category = query.category;
  }

  if (query.date) {
    const { start, end } = toLocalDateRange(query.date);
    filter.scheduledAt = { $gte: start, $lte: end };
  }

  const [items, totalItems] = await Promise.all([
    Maintenance.find(filter)
      .sort({ [sortBy]: sortOrder, _id: -1 })
      .skip(skip)
      .limit(limit),
    Maintenance.countDocuments(filter),
  ]);

  return {
    items: items.map(toMaintenanceDto),
    page,
    limit,
    totalItems,
    totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
  };
};

const getMaintenanceDetails = async (gymId, maintenanceId) => {
  const item = await getMaintenanceOrThrow(gymId, maintenanceId);
  return {
    item: toMaintenanceDto(item),
  };
};

const updateMaintenance = async (gymId, maintenanceId, payload) => {
  const item = await getMaintenanceOrThrow(gymId, maintenanceId);

  if (typeof payload.title !== "undefined") {
    item.title = payload.title;
  }

  if (typeof payload.description !== "undefined") {
    item.description = payload.description;
  }

  if (typeof payload.category !== "undefined") {
    item.category = payload.category;
  }

  if (typeof payload.scheduledAt !== "undefined") {
    item.scheduledAt = new Date(payload.scheduledAt);
  }

  if (typeof payload.notes !== "undefined") {
    item.notes = payload.notes;
  }

  await item.save();

  return {
    item: toMaintenanceDto(item),
  };
};

const updateMaintenanceStatus = async (gymId, maintenanceId, status) => {
  const item = await getMaintenanceOrThrow(gymId, maintenanceId);

  if (item.status === status) {
    return {
      item: toMaintenanceDto(item),
    };
  }

  const allowedTransitions = STATUS_TRANSITIONS[item.status] || [];
  if (!allowedTransitions.includes(status)) {
    throw new AppError(`Cannot change status from ${item.status} to ${status}`, 422);
  }

  item.status = status;
  if (status === "Completed") {
    item.completedAt = new Date();
  }

  await item.save();

  return {
    item: toMaintenanceDto(item),
  };
};

const deleteMaintenance = async (gymId, maintenanceId) => {
  const item = await getMaintenanceOrThrow(gymId, maintenanceId);

  if (item.status === "Completed") {
    throw new AppError("Completed maintenance tasks cannot be deleted", 422);
  }

  await Maintenance.deleteOne({ _id: item._id, gymId });
};

module.exports = {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_STATUSES,
  createMaintenance,
  deleteMaintenance,
  getMaintenanceDetails,
  listMaintenance,
  updateMaintenance,
  updateMaintenanceStatus,
};
