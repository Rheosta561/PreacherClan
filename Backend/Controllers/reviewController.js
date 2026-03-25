const { validationResult } = require("express-validator");
const { AppError } = require("../Services/gymAuthService");
const {
  createReview,
  deleteGymReview,
  deleteOwnReview,
  getReviewDetails,
  listGymDashboardReviews,
  listReviewsForGym,
  updateOwnReview,
} = require("../Services/reviewService");

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
  const result = await createReview(req.user.id, req.body);
  return res.status(201).json({
    message: "Review created successfully",
    ...result,
  });
});

const listGymReviewsPublic = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await listReviewsForGym(req.params.gymId, req.query, true);
  return res.status(200).json(result);
});

const getItem = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await getReviewDetails(req.params.reviewId);
  return res.status(200).json(result);
});

const updateItem = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await updateOwnReview(req.user.id, req.params.reviewId, req.body);
  return res.status(200).json({
    message: "Review updated successfully",
    ...result,
  });
});

const deleteOwnItem = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await deleteOwnReview(req.user.id, req.params.reviewId);
  return res.status(200).json({
    message: "Review deleted successfully",
    ...result,
  });
});

const listGymDashboardItems = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await listGymDashboardReviews(req.gym.id, req.query);
  return res.status(200).json(result);
});

const deleteGymItem = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await deleteGymReview(req.gym.id, req.params.reviewId);
  return res.status(200).json({
    message: "Review deleted successfully",
    ...result,
  });
});

module.exports = {
  createItem,
  deleteGymItem,
  deleteOwnItem,
  getItem,
  listGymDashboardItems,
  listGymReviewsPublic,
  updateItem,
};
