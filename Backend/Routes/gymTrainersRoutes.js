const express = require("express");
const { body, param, query } = require("express-validator");
const gymAuthMiddleware = require("../Middleware/gymAuthMiddleware");
const {
  addTrainer,
  assignMember,
  getTrainer,
  listTrainers,
  removeTrainer,
  searchUsers,
  unassignMember,
  updateTrainer,
} = require("../Controllers/gymTrainersController");

const router = express.Router();

router.use(gymAuthMiddleware);

router.get(
  "/trainers",
  [
    query("search").optional().isString().trim().isLength({ min: 1, max: 100 }),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  listTrainers
);

router.get(
  "/trainers/search-users",
  [
    query("search").optional().isString().trim().isLength({ min: 1, max: 100 }),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  searchUsers
);

router.post(
  "/trainers",
  [
    body("trainerUserId").isMongoId(),
    body("fee").optional().isFloat({ min: 0 }),
    body("tags").optional().isArray(),
  ],
  addTrainer
);

router.get(
  "/trainers/:trainerId",
  [param("trainerId").isMongoId()],
  getTrainer
);

router.patch(
  "/trainers/:trainerId",
  [
    param("trainerId").isMongoId(),
    body("fee").optional().isFloat({ min: 0 }),
    body("tags").optional().isArray(),
    body("isActive").optional().isBoolean(),
    body().custom((value) => {
      const keys = ["fee", "tags", "isActive"];
      return keys.some((key) => Object.prototype.hasOwnProperty.call(value, key));
    }).withMessage("At least one trainer field is required"),
  ],
  updateTrainer
);

router.delete(
  "/trainers/:trainerId",
  [param("trainerId").isMongoId()],
  removeTrainer
);

router.post(
  "/trainers/:trainerId/assign-member",
  [
    param("trainerId").isMongoId(),
    body("memberUserId").isMongoId(),
  ],
  assignMember
);

router.delete(
  "/trainers/:trainerId/assign-member/:memberUserId",
  [
    param("trainerId").isMongoId(),
    param("memberUserId").isMongoId(),
  ],
  unassignMember
);

module.exports = router;
