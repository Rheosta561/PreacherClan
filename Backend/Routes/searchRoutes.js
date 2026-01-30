const express= require('express')
const router = express.Router();
const searchController = require('../Controllers/searchController');


router.get('/' , searchController.search);
router.get('/partner' , searchController.searchFriends);
module.exports = router ;
