const express = require('express');
const router = express.Router();
const RequestHandler = require('../Controllers/requestHandler');


router.post('/:userId/:requestId', RequestHandler.requestAccepter);
router.get('/:userId', RequestHandler.getRequests);
router.delete('/:userId/:requestId', RequestHandler.requestRejecter);
router.post('/send/:userId/:partnerId', RequestHandler.requestSender);

module.exports = router;