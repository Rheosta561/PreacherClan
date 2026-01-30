const express = require("express");
const router = express.Router();
const ctrl = require("../Controllers/workoutSplitController");


router.post("/create",  ctrl.createSplit);
router.put("/:splitId",  ctrl.updateSplit);
router.get("/:splitId", ctrl.getSplitById);

router.post("/share/:splitId", ctrl.generateShareToken);
router.get("/shared/:token", ctrl.getSharedSplit);
router.post("/search", ctrl.searchSplits);


module.exports = router;
