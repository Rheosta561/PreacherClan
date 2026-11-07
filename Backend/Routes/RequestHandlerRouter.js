const express = require("express");
const router = express.Router();
const auth = require("../Middleware/auth");
const RequestHandler = require("../Controllers/requestHandler");

function requireRouteOwner(req, res, next) {
    if (req.user?.id !== req.params.userId) {
        return res.status(403).json({ message: "Forbidden" });
    }
    return next();
}

router.post("/:userId/:requestId", auth, requireRouteOwner, RequestHandler.requestAccepter);
router.get("/:userId", auth, requireRouteOwner, RequestHandler.getRequests);
router.delete("/:userId/:requestId", auth, requireRouteOwner, RequestHandler.requestRejecter);
router.post("/send/:userId/:partnerId", auth, requireRouteOwner, RequestHandler.requestSender);

module.exports = router;
