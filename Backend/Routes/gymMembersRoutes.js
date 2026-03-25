const express = require("express");
const { body, param, query } = require("express-validator");
const {
  getMembers,
  revokeMembership,
  updateMembership,
} = require("../Controllers/gymMembersController");
const gymAuthMiddleware = require("../Middleware/gymAuthMiddleware");
const {
  MEMBERSHIP_STATUSES,
  MEMBERSHIP_TYPES,
} = require("../Services/gymMembersService");

const router = express.Router();

router.use(gymAuthMiddleware);

router.get(
  "/members",
  [
    query("search").optional().isString().trim().isLength({ min: 1, max: 100 }),
    query("status").optional().isIn(MEMBERSHIP_STATUSES),
    query("membershipType").optional().isIn(MEMBERSHIP_TYPES),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  getMembers
);

router.patch(
  "/members/:memberId/membership",
  [
    param("memberId").isMongoId(),
    body("membershipType").optional().isIn(MEMBERSHIP_TYPES),
    body("membershipStatus").optional().isIn(["Active", "Paused", "Expired"]),
    body("membershipStartsAt").optional({ nullable: true }).isISO8601(),
    body("membershipEndsAt").optional({ nullable: true }).isISO8601(),
    body().custom((value) => {
      const keys = ["membershipType", "membershipStatus", "membershipStartsAt", "membershipEndsAt"];
      return keys.some((key) => Object.prototype.hasOwnProperty.call(value, key));
    }).withMessage("At least one membership field is required"),
  ],
  updateMembership
);

router.post(
  "/members/:memberId/revoke",
  [
    param("memberId").isMongoId(),
    body("reason").optional().isString().trim().isLength({ max: 500 }),
  ],
  revokeMembership
);

module.exports = router;
