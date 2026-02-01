const express = require("express");
const { fixUserGymData , clearUserGym  , resetAllGymAndUserData} = require("../Controllers/adminFixController");


const router = express.Router();

router.post("/fix-user-gym", fixUserGymData);
router.post('/clear-data', clearUserGym );
router.post('/reset', resetAllGymAndUserData )
module.exports = router;
