const express = require("express");
const Profile = require("../Models/Profile");
const router = express.Router();
const User = require("../Models/User");
const auth = require("../Middleware/auth");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../config/cloudinary");

// Dedicated Cloudinary storage for profile images
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "profile_images",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
  },
});

const profileUpload = multer({ storage: profileStorage }).fields([
  { name: "profileImage", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
]);

// Fields an authenticated user is allowed to update on their own profile
const ALLOWED_PROFILE_FIELDS = [
  "about",
  "fitnessGoals",
  "ambition",
  "timings",
  "exerciseGenre",
  "socialHandles",
];

// POST /profile/:userId — create profile (must be authenticated as that user)
router.post("/:userId", auth, async (req, res) => {
  try {
    // Ensure the token owner can only create their own profile
    if (req.user.id !== req.params.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const existingProfile = await Profile.findOne({ userId: req.params.userId });
    if (existingProfile) {
      return res.status(400).json({ message: "Profile Already Exists" });
    }

    const profile = new Profile(req.body);
    const user = await User.findOne({ _id: req.params.userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.profile = profile._id;
    await user.save();
    profile.userId = req.params.userId;
    await profile.save();
    res.status(201).json({ profile, message: "Profile created successfully", user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /profile/:userId — public read (no auth required — profile data is social)
router.get("/:userId", async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.params.userId })
      .populate({
        path: "userId",
        select: "name username email preacherScore isVerified isTrainer isAdmin streak partner",
        populate: { path: "partner", select: "name username profileImage preacherScore" },
      });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    res.json({ profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /profile/:userId — update profile (must be authenticated as that user)
router.put("/:userId", auth, (req, res, next) => {
  // Run multer first, then proceed to business logic
  profileUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: "File upload failed", details: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    // Token owner must match the target user
    if (req.user.id !== req.params.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Build the update object from only the explicitly allowed fields (no mass assignment)
    const update = {};

    ALLOWED_PROFILE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        let value = req.body[field];
        // FormData sends arrays/objects as JSON strings — parse them back
        if (typeof value === "string") {
          try {
            value = JSON.parse(value);
          } catch {
            // Not JSON, keep as string
          }
        }
        update[field] = value;
      }
    });

    // Handle uploaded images from Cloudinary
    if (req.files) {
      if (req.files.profileImage?.[0]) {
        update.profileImage = req.files.profileImage[0].path;
      }
      if (req.files.coverImage?.[0]) {
        update.coverImage = req.files.coverImage[0].path;
      }
    }

    const profile = await Profile.findOneAndUpdate(
      { userId: req.params.userId },
      update,
      { new: true, runValidators: true, upsert: true }
    );

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(profile);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /profile/:userId — delete own profile (must be authenticated as that user)
router.delete("/:userId", auth, async (req, res) => {
  try {
    if (req.user.id !== req.params.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const profile = await Profile.findOneAndDelete({ userId: req.params.userId });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    res.json({ message: "Profile deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

