const { validationResult } = require("express-validator");
const { AppError } = require("../Services/gymAuthService");
const {
  addTrainerToGym,
  assignTrainerToMember,
  getTrainerDetails,
  listGymTrainers,
  removeTrainerFromGym,
  searchExistingUsersForTrainers,
  unassignTrainerFromMember,
  updateTrainerDetails,
} = require("../Services/gymTrainersService");

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const ensureValid = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError("Validation failed", 422, errors.array());
  }
};

const listTrainers = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await listGymTrainers(req.gym.id, req.query);
  return res.status(200).json(result);
});

const searchUsers = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await searchExistingUsersForTrainers(req.gym.id, req.query);
  return res.status(200).json(result);
});

const addTrainer = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await addTrainerToGym(req.gym.id, req.body);
  return res.status(201).json({
    message: "Trainer added successfully",
    ...result,
  });
});

const getTrainer = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await getTrainerDetails(req.gym.id, req.params.trainerId);
  return res.status(200).json(result);
});

const updateTrainer = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await updateTrainerDetails(req.gym.id, req.params.trainerId, req.body);
  return res.status(200).json({
    message: "Trainer updated successfully",
    ...result,
  });
});

const removeTrainer = asyncHandler(async (req, res) => {
  ensureValid(req);
  await removeTrainerFromGym(req.gym.id, req.params.trainerId);
  return res.status(200).json({
    message: "Trainer removed successfully",
  });
});

const assignMember = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await assignTrainerToMember(req.gym.id, req.params.trainerId, req.body.memberUserId);
  return res.status(200).json({
    message: "Member assigned to trainer successfully",
    ...result,
  });
});

const unassignMember = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await unassignTrainerFromMember(req.gym.id, req.params.trainerId, req.params.memberUserId);
  return res.status(200).json({
    message: "Member unassigned from trainer successfully",
    ...result,
  });
});

module.exports = {
  addTrainer,
  assignMember,
  getTrainer,
  listTrainers,
  removeTrainer,
  searchUsers,
  unassignMember,
  updateTrainer,
};
