const express = require("express");
const { sendReminders } = require("../Controllers/grievanceController");

const router = express.Router();

router.post("/grievances/send-reminders", sendReminders);

module.exports = router;
