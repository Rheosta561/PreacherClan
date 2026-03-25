const express = require("express");
const { query } = require("express-validator");
const gymAuthMiddleware = require("../Middleware/gymAuthMiddleware");
const {
  getInsightsPayload,
  getOverviewPayload,
  getRevenuePayload,
  getStatsPayload,
} = require("../Controllers/gymOverviewController");
const { OVERVIEW_REVENUE_FILTERS } = require("../Services/gymOverviewService");

const router = express.Router();

router.use(gymAuthMiddleware);

router.get("/overview", [
  query("filter").optional().isIn(OVERVIEW_REVENUE_FILTERS),
], getOverviewPayload);

router.get("/overview/stats", getStatsPayload);

router.get("/overview/revenue", [
  query("filter").optional().isIn(OVERVIEW_REVENUE_FILTERS),
], getRevenuePayload);

router.get("/overview/insights", getInsightsPayload);

module.exports = router;
