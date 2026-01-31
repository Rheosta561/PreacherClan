const express = require("express");
const { fixUserGymData , clearUserGym } = require("../Controllers/adminFixController");


const router = express.Router();

router.post("/fix-user-gym", fixUserGymData);
router.post('/clear-data', clearUserGym );
module.exports = router;
