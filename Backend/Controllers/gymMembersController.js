const { validationResult } = require("express-validator");
const { AppError } = require("../Services/gymAuthService");
const {
  listGymMembers,
  revokeGymMember,
  updateGymMemberMembership,
} = require("../Services/gymMembersService");

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const ensureValid = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError("Validation failed", 422, errors.array());
  }
};

const getMembers = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await listGymMembers(req.gym.id, req.query);

  return res.status(200).json(result);
});

const updateMembership = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await updateGymMemberMembership(req.gym.id, req.params.memberId, req.body);

  return res.status(200).json({
    message: "Membership updated successfully",
    ...result,
  });
});

const revokeMembership = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await revokeGymMember(req.gym.id, req.params.memberId, req.body.reason);

  return res.status(200).json({
    message: "Membership revoked successfully",
    ...result,
  });
});

module.exports = {
  getMembers,
  revokeMembership,
  updateMembership,
};
