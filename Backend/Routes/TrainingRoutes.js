const express = require("express");
const router = express.Router();
const TrainingController = require("../Controllers/TrainingController");
const auth = require("../Middleware/auth");

router.post("/start", auth, TrainingController.startOrResumeSession);
router.put("/progress", auth, TrainingController.updateProgress);
router.post("/complete", auth, TrainingController.completeSession);
router.post("/cancel", auth, TrainingController.cancelSession);

module.exports = router;
