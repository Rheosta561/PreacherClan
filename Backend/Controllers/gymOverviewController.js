const { validationResult } = require("express-validator");
const { AppError } = require("../Services/gymAuthService");
const {
  getInsights,
  getOverview,
  getRevenue,
  getStats,
} = require("../Services/gymOverviewService");

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const ensureValid = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError("Validation failed", 422, errors.array());
  }
};

const getOverviewPayload = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await getOverview(req.gym.id, req.query.filter);
  return res.status(200).json(result);
});

const getStatsPayload = asyncHandler(async (req, res) => {
  const result = await getStats(req.gym.id);
  return res.status(200).json(result);
});

const getRevenuePayload = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await getRevenue(req.gym.id, req.query.filter);
  return res.status(200).json(result);
});

const getInsightsPayload = asyncHandler(async (req, res) => {
  const result = await getInsights(req.gym.id);
  return res.status(200).json(result);
});

module.exports = {
  getInsightsPayload,
  getOverviewPayload,
  getRevenuePayload,
  getStatsPayload,
};
