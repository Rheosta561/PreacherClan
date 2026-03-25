const express = require("express");
const { body } = require("express-validator");
const {
  login,
  logout,
  logoutAll,
  me,
  refresh,
  register,
} = require("../Controllers/gymAuthController");
const gymAuthMiddleware = require("../Middleware/gymAuthMiddleware");

const router = express.Router();

const registerValidation = [
  body("name").trim().isLength({ min: 2, max: 120 }),
  body("username")
    .trim()
    .toLowerCase()
    .matches(/^[a-z0-9._-]+$/)
    .isLength({ min: 3, max: 30 }),
  body("password")
    .isString()
    .isLength({ min: 8, max: 128 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
  body("location").trim().isLength({ min: 2, max: 200 }),
  body("description").trim().isLength({ min: 10, max: 2000 }),
  body("gymCode").trim().isLength({ min: 4, max: 32 }),
  body("contact.email").optional({ values: "falsy" }).isEmail().normalizeEmail(),
  body("contact.phone").optional({ values: "falsy" }).trim().isLength({ min: 6, max: 30 }),
  body("address.latitude").optional({ nullable: true }).isFloat({ min: -90, max: 90 }),
  body("address.longitude").optional({ nullable: true }).isFloat({ min: -180, max: 180 }),
  body("rating").optional().isFloat({ min: 0, max: 5 }),
  body("membership.monthly").optional().isFloat({ min: 0 }),
  body("membership.quarterly").optional().isFloat({ min: 0 }),
  body("membership.halfYearly").optional().isFloat({ min: 0 }),
  body("membership.yearly").optional().isFloat({ min: 0 }),
  body("facilities").optional().isArray(),
  body("equipment").optional().isArray(),
  body("gallery").optional().isArray(),
];

const loginValidation = [
  body("username").trim().notEmpty(),
  body("password").isString().notEmpty(),
];

router.post("/register", registerValidation, register);
router.post("/login", loginValidation, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/logout-all", gymAuthMiddleware, logoutAll);
router.get("/me", gymAuthMiddleware, me);

module.exports = router;
