const express = require("express");
const { body, param, query } = require("express-validator");
const authMiddleware = require("../Middleware/auth");
const {
  createItem,
  deleteMine,
  getForUser,
  listMine,
  updateMine,
} = require("../Controllers/grievanceController");
const {
  GRIEVANCE_PRIORITIES,
  GRIEVANCE_STATUSES,
  GRIEVANCE_TYPES,
} = require("../Services/grievanceService");

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  [
    body("gymId").isMongoId(),
    body("subject").trim().isLength({ min: 1, max: 200 }),
    body("description").trim().isLength({ min: 1, max: 4000 }),
    body("type").isIn(GRIEVANCE_TYPES),
    body("priority").optional().isIn(GRIEVANCE_PRIORITIES),
    body("attachments").optional().isArray(),
  ],
  createItem
);

router.get(
  "/me",
  authMiddleware,
  [
    query("status").optional().isIn(GRIEVANCE_STATUSES),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  listMine
);

router.get(
  "/:grievanceId",
  authMiddleware,
  [param("grievanceId").isMongoId()],
  getForUser
);

router.patch(
  "/:grievanceId",
  authMiddleware,
  [
    param("grievanceId").isMongoId(),
    body("subject").optional().trim().isLength({ min: 1, max: 200 }),
    body("description").optional().trim().isLength({ min: 1, max: 4000 }),
    body("type").optional().isIn(GRIEVANCE_TYPES),
    body("priority").optional().isIn(GRIEVANCE_PRIORITIES),
    body("attachments").optional().isArray(),
    body().custom((value) => {
      const keys = ["subject", "description", "type", "priority", "attachments"];
      return keys.some((key) => Object.prototype.hasOwnProperty.call(value, key));
    }).withMessage("At least one grievance field is required"),
  ],
  updateMine
);

router.delete(
  "/:grievanceId",
  authMiddleware,
  [param("grievanceId").isMongoId()],
  deleteMine
);

module.exports = router;
