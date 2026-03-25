const express = require("express");
const { body, param, query } = require("express-validator");
const authMiddleware = require("../Middleware/auth");
const {
  createItem,
  deleteOwnItem,
  getItem,
  listGymReviewsPublic,
  updateItem,
} = require("../Controllers/reviewController");

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  [
    body("gymId").isMongoId(),
    body("rating").isFloat({ min: 1, max: 5 }),
    body("comment").trim().isLength({ min: 1, max: 2000 }),
    body("images").optional().isArray(),
  ],
  createItem
);

router.get(
  "/gym/:gymId",
  [
    param("gymId").isMongoId(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("sortBy").optional().isIn(["createdAt", "updatedAt", "rating"]),
    query("sortOrder").optional().isIn(["asc", "desc"]),
  ],
  listGymReviewsPublic
);

router.get(
  "/:reviewId",
  [param("reviewId").isMongoId()],
  getItem
);

router.patch(
  "/:reviewId",
  authMiddleware,
  [
    param("reviewId").isMongoId(),
    body("rating").optional().isFloat({ min: 1, max: 5 }),
    body("comment").optional().trim().isLength({ min: 1, max: 2000 }),
    body("images").optional().isArray(),
    body().custom((value) => {
      const keys = ["rating", "comment", "images"];
      return keys.some((key) => Object.prototype.hasOwnProperty.call(value, key));
    }).withMessage("At least one review field is required"),
  ],
  updateItem
);

router.delete(
  "/:reviewId",
  authMiddleware,
  [param("reviewId").isMongoId()],
  deleteOwnItem
);

module.exports = router;
