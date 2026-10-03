const express = require("express");
const router = express.Router();
const ctrl = require("../Controllers/workoutSplitController");
const auth = require("../Middleware/auth");

router.post("/create", auth, ctrl.createSplit);
router.put("/:splitId", auth, ctrl.updateSplit);
router.get("/:splitId", ctrl.getSplitById);

router.post("/share/:splitId", ctrl.generateShareToken);
router.get("/shared/:token", ctrl.getSharedSplit);
router.post("/search", ctrl.searchSplits);

module.exports = router;
