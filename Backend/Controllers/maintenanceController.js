const { validationResult } = require("express-validator");
const { AppError } = require("../Services/gymAuthService");
const {
  createMaintenance,
  deleteMaintenance,
  getMaintenanceDetails,
  listMaintenance,
  updateMaintenance,
  updateMaintenanceStatus,
} = require("../Services/maintenanceService");

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
  const result = await createMaintenance(req.gym.id, req.body);
  return res.status(201).json({
    message: "Maintenance task created successfully",
    ...result,
  });
});

const listItems = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await listMaintenance(req.gym.id, req.query);
  return res.status(200).json(result);
});

const getItem = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await getMaintenanceDetails(req.gym.id, req.params.maintenanceId);
  return res.status(200).json(result);
});

const updateItem = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await updateMaintenance(req.gym.id, req.params.maintenanceId, req.body);
  return res.status(200).json({
    message: "Maintenance task updated successfully",
    ...result,
  });
});

const updateStatus = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await updateMaintenanceStatus(req.gym.id, req.params.maintenanceId, req.body.status);
  return res.status(200).json({
    message: "Maintenance status updated successfully",
    ...result,
  });
});

const deleteItem = asyncHandler(async (req, res) => {
  ensureValid(req);
  await deleteMaintenance(req.gym.id, req.params.maintenanceId);
  return res.status(200).json({
    message: "Maintenance task deleted successfully",
  });
});

module.exports = {
  createItem,
  deleteItem,
  getItem,
  listItems,
  updateItem,
  updateStatus,
};
