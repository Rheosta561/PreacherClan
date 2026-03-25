const express = require("express");
const { body, param, query } = require("express-validator");
const gymAuthMiddleware = require("../Middleware/gymAuthMiddleware");
const {
  getForGym,
  listGymItems,
  updateGymItem,
  updateStatusForGym,
} = require("../Controllers/grievanceController");
const {
  GRIEVANCE_PRIORITIES,
  GRIEVANCE_STATUSES,
  GRIEVANCE_TYPES,
} = require("../Services/grievanceService");

const router = express.Router();

router.use(gymAuthMiddleware);

router.get(
  "/grievances",
  [
    query("search").optional().isString().trim().isLength({ min: 1, max: 100 }),
    query("status").optional().isIn(GRIEVANCE_STATUSES),
    query("type").optional().isIn(GRIEVANCE_TYPES),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("sortBy").optional().isIn(["createdAt", "updatedAt", "status", "priority", "type"]),
    query("sortOrder").optional().isIn(["asc", "desc"]),
  ],
  listGymItems
);

router.get(
  "/grievances/:grievanceId",
  [param("grievanceId").isMongoId()],
  getForGym
);

router.patch(
  "/grievances/:grievanceId/status",
  [
    param("grievanceId").isMongoId(),
    body("status").isIn(GRIEVANCE_STATUSES),
  ],
  updateStatusForGym
);

router.patch(
  "/grievances/:grievanceId",
  [
    param("grievanceId").isMongoId(),
    body("notesByGym").optional({ nullable: true }).isString().trim().isLength({ max: 4000 }),
    body("priority").optional().isIn(GRIEVANCE_PRIORITIES),
    body().custom((value) => {
      const keys = ["notesByGym", "priority"];
      return keys.some((key) => Object.prototype.hasOwnProperty.call(value, key));
    }).withMessage("At least one gym grievance field is required"),
  ],
  updateGymItem
);

module.exports = router;
