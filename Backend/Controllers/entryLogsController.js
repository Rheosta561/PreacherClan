const { validationResult } = require("express-validator");
const { AppError } = require("../Services/gymAuthService");
const {
  createEntryLog,
  exportEntryLogs,
  getAnalyticsByTime,
  listEntryLogs,
} = require("../Services/entryLogsService");

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const ensureValid = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError("Validation failed", 422, errors.array());
  }
};

const createLog = asyncHandler(async (req, res) => {
  ensureValid(req);

  const log = await createEntryLog({
    gymId: req.gym.id,
    memberUserId: req.body.memberUserId,
    actionType: req.body.actionType,
    source: req.body.source,
    status: req.body.status,
    occurredAt: req.body.occurredAt,
    notes: req.body.notes,
    createdBy: {
      actorType: "gym",
      actorId: req.gym.id,
    },
  });

  return res.status(201).json({
    message: "Entry log created successfully",
    id: log._id,
  });
});

const listLogs = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await listEntryLogs(req.gym.id, req.query);
  return res.status(200).json(result);
});

const analyticsByTime = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await getAnalyticsByTime(req.gym.id, req.query);
  return res.status(200).json(result);
});

const exportLogs = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await exportEntryLogs(req.gym.id, req.query);
  return res.status(200).json(result);
});

module.exports = {
  analyticsByTime,
  createLog,
  exportLogs,
  listLogs,
};
