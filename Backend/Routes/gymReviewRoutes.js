const express = require("express");
const { param, query } = require("express-validator");
const gymAuthMiddleware = require("../Middleware/gymAuthMiddleware");
const {
  deleteGymItem,
  listGymDashboardItems,
} = require("../Controllers/reviewController");

const router = express.Router();

router.use(gymAuthMiddleware);

router.get(
  "/reviews",
  [
    query("search").optional().isString().trim().isLength({ min: 1, max: 100 }),
    query("rating").optional().isFloat({ min: 1, max: 5 }),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("sortBy").optional().isIn(["createdAt", "updatedAt", "rating"]),
    query("sortOrder").optional().isIn(["asc", "desc"]),
  ],
  listGymDashboardItems
);

router.delete(
  "/reviews/:reviewId",
  [param("reviewId").isMongoId()],
  deleteGymItem
);

module.exports = router;
