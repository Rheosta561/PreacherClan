const express = require("express");
const { body } = require("express-validator");
const gymAuthMiddleware = require("../Middleware/gymAuthMiddleware");
const { gymProfileMediaUpload } = require("../config/cloudinary");
const {
  deleteGalleryImage,
  getProfile,
  mediaUploadErrorHandler,
  updateProfile,
  updateProfileMedia,
} = require("../Controllers/gymProfileController");

const router = express.Router();

const parseStructuredInput = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    return JSON.parse(value);
  }

  return null;
};

const isStringArrayInput = (value) => {
  if (typeof value === "undefined") {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) => typeof item === "string");
  }

  if (typeof value === "string") {
    if (!value.trim()) {
      return true;
    }

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) && parsed.every((item) => typeof item === "string");
    } catch (error) {
      return true;
    }
  }

  return false;
};

const isNonNegativeNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const validateAddress = (value) => {
  if (typeof value === "undefined") {
    return true;
  }

  try {
    const address = parseStructuredInput(value);
    if (!address || typeof address !== "object" || Array.isArray(address)) {
      return false;
    }

    if (
      typeof address.latitude !== "undefined" &&
      (!Number.isFinite(Number(address.latitude)) ||
        Number(address.latitude) < -90 ||
        Number(address.latitude) > 90)
    ) {
      return false;
    }

    if (
      typeof address.longitude !== "undefined" &&
      (!Number.isFinite(Number(address.longitude)) ||
        Number(address.longitude) < -180 ||
        Number(address.longitude) > 180)
    ) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

const validateContact = (value) => {
  if (typeof value === "undefined") {
    return true;
  }

  try {
    const contact = parseStructuredInput(value);
    if (!contact || typeof contact !== "object" || Array.isArray(contact)) {
      return false;
    }

    if (
      typeof contact.email !== "undefined" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(contact.email).trim())
    ) {
      return false;
    }

    if (
      typeof contact.phone !== "undefined" &&
      !/^[0-9+\-()\s]{6,20}$/.test(String(contact.phone).trim())
    ) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

const validateMembership = (value) => {
  if (typeof value === "undefined") {
    return true;
  }

  try {
    const membership = parseStructuredInput(value);
    if (!membership || typeof membership !== "object" || Array.isArray(membership)) {
      return false;
    }

    const allowedKeys = ["monthly", "quarterly", "halfYearly", "yearly"];
    return allowedKeys.every((key) => {
      if (typeof membership[key] === "undefined") {
        return true;
      }

      return isNonNegativeNumber(Number(membership[key]));
    });
  } catch (error) {
    return false;
  }
};

router.use(gymAuthMiddleware);

router.get("/profile", getProfile);

router.patch(
  "/profile",
  [
    body("name").optional().trim().isLength({ min: 1, max: 120 }),
    body("location").optional().trim().isLength({ min: 1, max: 200 }),
    body("description").optional().trim().isLength({ min: 1, max: 2000 }),
    body("address")
      .optional()
      .custom(validateAddress)
      .withMessage("address must contain valid country/state/city and coordinates"),
    body("contact")
      .optional()
      .custom(validateContact)
      .withMessage("contact must contain a valid email and phone"),
    body("membership")
      .optional()
      .custom(validateMembership)
      .withMessage("membership must contain non-negative numeric values"),
    body("facilities")
      .optional()
      .custom(isStringArrayInput)
      .withMessage("facilities must be an array of strings"),
    body("equipment")
      .optional()
      .custom(isStringArrayInput)
      .withMessage("equipment must be an array of strings"),
    body().custom((value) => {
      const editableKeys = [
        "name",
        "location",
        "description",
        "address",
        "contact",
        "facilities",
        "equipment",
        "membership",
      ];

      return editableKeys.some((key) => Object.prototype.hasOwnProperty.call(value, key));
    }).withMessage("At least one editable gym profile field is required"),
  ],
  updateProfile
);

router.patch(
  "/profile/media",
  gymProfileMediaUpload,
  mediaUploadErrorHandler,
  updateProfileMedia
);

router.delete(
  "/profile/gallery-image",
  [body("imageUrl").trim().isURL()],
  deleteGalleryImage
);

module.exports = router;
