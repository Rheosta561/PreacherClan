const { validationResult } = require("express-validator");
const { AppError } = require("../Services/gymAuthService");
const {
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
} = require("../Services/grievanceService");

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const ensureValid = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError("Validation failed", 422, errors.array());
  }
};

const createItem = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await createGrievance(req.user.id, req.body);
  return res.status(201).json({
    message: "Grievance created successfully",
    ...result,
  });
});

const listMine = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await listOwnGrievances(req.user.id, req.query);
  return res.status(200).json(result);
});

const getForUser = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await getGrievanceDetailsForUserOrGym({
    grievanceId: req.params.grievanceId,
    userId: req.user.id,
  });
  return res.status(200).json(result);
});

const updateMine = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await updateOwnGrievance(req.user.id, req.params.grievanceId, req.body);
  return res.status(200).json({
    message: "Grievance updated successfully",
    ...result,
  });
});

const deleteMine = asyncHandler(async (req, res) => {
  ensureValid(req);
  await deleteOwnGrievance(req.user.id, req.params.grievanceId);
  return res.status(200).json({
    message: "Grievance deleted successfully",
  });
});

const listGymItems = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await listGymGrievances(req.gym.id, req.query);
  return res.status(200).json(result);
});

const getForGym = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await getGrievanceDetailsForUserOrGym({
    grievanceId: req.params.grievanceId,
    gymId: req.gym.id,
  });
  return res.status(200).json(result);
});

const updateStatusForGym = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await updateGymGrievanceStatus(req.gym.id, req.params.grievanceId, req.body.status);
  return res.status(200).json({
    message: "Grievance status updated successfully",
    ...result,
  });
});

const updateGymItem = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await updateGymGrievance(req.gym.id, req.params.grievanceId, req.body);
  return res.status(200).json({
    message: "Grievance updated successfully",
    ...result,
  });
});

const sendReminders = asyncHandler(async (req, res) => {
  const providedSecret = req.get(INTERNAL_SECRET_HEADER);
  verifyInternalReminderSecret(providedSecret);
  const result = await sendUnresolvedGrievanceReminders();
  return res.status(200).json(result);
});

module.exports = {
  createItem,
  deleteMine,
  getForGym,
  getForUser,
  listGymItems,
  listMine,
  sendReminders,
  updateGymItem,
  updateMine,
  updateStatusForGym,
};
