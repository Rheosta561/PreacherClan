const express = require("express");
const { body, param, query } = require("express-validator");
const gymAuthMiddleware = require("../Middleware/gymAuthMiddleware");
const {
  createItem,
  deleteItem,
  getItem,
  listItems,
  updateItem,
  updateStatus,
} = require("../Controllers/maintenanceController");
const {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_STATUSES,
} = require("../Services/maintenanceService");

const router = express.Router();

router.use(gymAuthMiddleware);

router.post(
  "/maintenance",
  [
    body("title").trim().isLength({ min: 1, max: 200 }),
    body("description").trim().isLength({ min: 1, max: 2000 }),
    body("category").isIn(MAINTENANCE_CATEGORIES),
    body("scheduledAt").isISO8601(),
    body("status").optional().isIn(MAINTENANCE_STATUSES),
    body("notes").optional({ nullable: true }).isString().trim().isLength({ max: 1000 }),
  ],
  createItem
);

router.get(
  "/maintenance",
  [
    query("search").optional().isString().trim().isLength({ min: 1, max: 100 }),
    query("status").optional().isIn(MAINTENANCE_STATUSES),
    query("category").optional().isIn(MAINTENANCE_CATEGORIES),
    query("date").optional().matches(/^\d{4}-\d{2}-\d{2}$/),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("sortBy").optional().isIn(["scheduledAt", "createdAt", "updatedAt", "status", "category"]),
    query("sortOrder").optional().isIn(["asc", "desc"]),
  ],
  listItems
);

router.get(
  "/maintenance/:maintenanceId",
  [param("maintenanceId").isMongoId()],
  getItem
);

router.patch(
  "/maintenance/:maintenanceId",
  [
    param("maintenanceId").isMongoId(),
    body("title").optional().trim().isLength({ min: 1, max: 200 }),
    body("description").optional().trim().isLength({ min: 1, max: 2000 }),
    body("category").optional().isIn(MAINTENANCE_CATEGORIES),
    body("scheduledAt").optional().isISO8601(),
    body("notes").optional({ nullable: true }).isString().trim().isLength({ max: 1000 }),
    body().custom((value) => {
      const keys = ["title", "description", "category", "scheduledAt", "notes"];
      return keys.some((key) => Object.prototype.hasOwnProperty.call(value, key));
    }).withMessage("At least one maintenance field is required"),
  ],
  updateItem
);

router.patch(
  "/maintenance/:maintenanceId/status",
  [
    param("maintenanceId").isMongoId(),
    body("status").isIn(MAINTENANCE_STATUSES),
  ],
  updateStatus
);

router.delete(
  "/maintenance/:maintenanceId",
  [param("maintenanceId").isMongoId()],
  deleteItem
);

module.exports = router;
