const express = require("express");
const { body, param, query } = require("express-validator");
const gymAuthMiddleware = require("../Middleware/gymAuthMiddleware");
const {
  createItem,
  getItem,
  listItems,
} = require("../Controllers/announcementController");
const {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_STATUSES,
} = require("../Services/announcementService");

const router = express.Router();

router.use(gymAuthMiddleware);

router.post(
  "/announcements",
  [
    body("title").trim().isLength({ min: 1, max: 200 }),
    body("message").trim().isLength({ min: 1, max: 3000 }),
    body("category").isIn(ANNOUNCEMENT_CATEGORIES),
    body("audience").isIn(ANNOUNCEMENT_AUDIENCES),
    body("subjectLine").optional().isString().trim().isLength({ min: 1, max: 200 }),
    body("deliveryChannels.push").optional().isBoolean(),
    body("deliveryChannels.email").optional().isBoolean(),
    body("deliveryChannels").custom((value, { req }) => {
      const push = req.body?.deliveryChannels?.push;
      const email = req.body?.deliveryChannels?.email;
      return Boolean(push || email);
    }).withMessage("At least one delivery channel must be enabled"),
  ],
  createItem
);

router.get(
  "/announcements",
  [
    query("search").optional().isString().trim().isLength({ min: 1, max: 100 }),
    query("category").optional().isIn(ANNOUNCEMENT_CATEGORIES),
    query("audience").optional().isIn(ANNOUNCEMENT_AUDIENCES),
    query("status").optional().isIn(ANNOUNCEMENT_STATUSES),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("sortBy").optional().isIn(["createdAt", "updatedAt", "sentAt", "status", "category", "audience"]),
    query("sortOrder").optional().isIn(["asc", "desc"]),
  ],
  listItems
);

router.get(
  "/announcements/:announcementId",
  [param("announcementId").isMongoId()],
  getItem
);

module.exports = router;
