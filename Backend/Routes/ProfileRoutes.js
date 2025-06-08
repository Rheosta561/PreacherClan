const express = require("express");
const Profile = require("../Models/Profile");
const router = express.Router();
const User = require("../Models/User");
const { upload} = require('../config/cloudinary');
const notificationService = require('../Utils/NotificationService');
const {emitProfileUpdate} = require('../Utils/profileUpdated');


router.post("/:userId", upload, async (req, res) => {
  try {
    const profileImageUrl = req.files?.profileImage?.[0]?.path || null;
    const coverImageUrl = req.files?.image?.[0]?.path || null;

    // Parse stringified arrays (safely fallback to [])
    const fitnessGoals = JSON.parse(req.body.fitnessGoals || "[]");
    const ambition = JSON.parse(req.body.ambition || "[]");
    const exerciseGenre = JSON.parse(req.body.exerciseGenre || "[]");

    const profileData = {
      about: req.body.about || "",
      instagram: req.body.instagram || "",
      twitter: req.body.twitter || "",
      facebook: req.body.facebook || "",
      youtube: req.body.youtube || "",
      fitnessGoals,
      ambition,
      exerciseGenre,
      profileImage: profileImageUrl,
      coverImage: coverImageUrl,
      userId: req.params.userId,
    };

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const profile = new Profile(profileData);
    await profile.save();

    user.profile = profile._id;
    await user.save();

    res
      .status(201)
      .json({ profile, message: "Profile created successfully", user });
  } catch (error) {
    console.error("Error creating profile:", error);
    res.status(400).json({ error: error.message });
  }
});



router.get("/:userId", async (req, res) => {
    try {
        const profile = await Profile.findOne({ userId: req.params.userId }).populate("userId");
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }
        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.put("/:userId", upload, async (req, res) => {
  try {
    const profileImageUrl = req.files?.profileImage?.[0]?.path;
    const coverImageUrl = req.files?.image?.[0]?.path;

    // Safely parse array fields from stringified values
    const fitnessGoals = JSON.parse(req.body.fitnessGoals || "[]");
    const ambition = JSON.parse(req.body.ambition || "[]");
    const exerciseGenre = JSON.parse(req.body.exerciseGenre || "[]");

    const updateData = {
      about: req.body.about || "",
      socialHandles : req.body.socialHandles || {},
      fitnessGoals,
      ambition,
      exerciseGenre,
      userId: req.params.userId,
    };
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Only set new image paths if uploaded
    if (profileImageUrl) updateData.profileImage = profileImageUrl;
    if (coverImageUrl) updateData.coverImage = coverImageUrl;

    const profile = await Profile.findOneAndUpdate(
      { userId: req.params.userId },
      updateData,
      { new: true, runValidators: true, upsert: true }
    ).populate("userId");

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Optional: Emit profile update event if you have this logic
   emitProfileUpdate(profile);
   notificationService.sendNotification(
      user,
      "Your profile has been updated successfully",
      "info"
    );
    res.json({ message: "Profile updated successfully", profile });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(400).json({ error: error.message });
  }
});




router.delete("/:userId", async (req, res) => {
    try {
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
