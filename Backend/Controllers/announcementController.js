const { validationResult } = require("express-validator");
const { AppError } = require("../Services/gymAuthService");
const {
  createAndSendAnnouncement,
  getAnnouncementDetails,
  listAnnouncements,
} = require("../Services/announcementService");

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
  const result = await createAndSendAnnouncement(req.gym.id, req.body);
  return res.status(201).json({
    message: "Announcement created and processed successfully",
    ...result,
  });
});

const listItems = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await listAnnouncements(req.gym.id, req.query);
  return res.status(200).json(result);
});

const getItem = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await getAnnouncementDetails(req.gym.id, req.params.announcementId);
  return res.status(200).json(result);
});

module.exports = {
  createItem,
  getItem,
  listItems,
};
