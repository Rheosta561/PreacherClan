const express = require("express");
const { body, query } = require("express-validator");
const gymAuthMiddleware = require("../Middleware/gymAuthMiddleware");
const {
  analyticsByTime,
  createLog,
  exportLogs,
  listLogs,
} = require("../Controllers/entryLogsController");

const router = express.Router();

router.use(gymAuthMiddleware);

router.post(
  "/entry-logs",
  [
    body("memberUserId").isMongoId(),
    body("actionType").isIn(["check_in", "check_out"]),
    body("source").isIn(["QR", "Manual", "RFID", "Mobile"]),
    body("status").optional().isIn(["Checked In", "Checked Out", "Denied"]),
    body("occurredAt").optional().isISO8601(),
    body("notes").optional().isString().trim().isLength({ max: 500 }),
  ],
  createLog
);

router.get(
  "/entry-logs",
  [
    query("search").optional().isString().trim().isLength({ min: 1, max: 100 }),
    query("date").optional().matches(/^\d{4}-\d{2}-\d{2}$/),
    query("day").optional().isIn(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]),
    query("startTime").optional().matches(/^\d{2}:\d{2}$/),
    query("endTime").optional().matches(/^\d{2}:\d{2}$/),
    query("status").optional().isIn(["Checked In", "Checked Out", "Denied"]),
    query("source").optional().isIn(["QR", "Manual", "RFID", "Mobile"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("sortBy").optional().isIn(["occurredAt", "status", "source"]),
    query("sortOrder").optional().isIn(["asc", "desc"]),
  ],
  listLogs
);

router.get(
  "/entry-logs/analytics/by-time",
  [
    query("date").matches(/^\d{4}-\d{2}-\d{2}$/),
    query("window").optional().isIn(["all", "morning", "afternoon", "evening", "night"]),
  ],
  analyticsByTime
);

router.get(
  "/entry-logs/export",
  [
    query("search").optional().isString().trim().isLength({ min: 1, max: 100 }),
    query("date").optional().matches(/^\d{4}-\d{2}-\d{2}$/),
    query("day").optional().isIn(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]),
    query("startTime").optional().matches(/^\d{2}:\d{2}$/),
    query("endTime").optional().matches(/^\d{2}:\d{2}$/),
    query("status").optional().isIn(["Checked In", "Checked Out", "Denied"]),
    query("source").optional().isIn(["QR", "Manual", "RFID", "Mobile"]),
  ],
  exportLogs
);

module.exports = router;
