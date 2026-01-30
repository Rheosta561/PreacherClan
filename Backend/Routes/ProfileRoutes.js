const express = require("express");
const Profile = require("../Models/Profile");
const router = express.Router();
const User = require("../Models/User");
const { upload} = require('../config/cloudinary');
const notificationService = require('../Utils/NotificationService');
const {emitProfileUpdate} = require('../Utils/profileUpdated');
const mongoose = require('mongoose');

// db fix 
function scoreProfile(p) {
  let score = 0;

  if (p.profileImage) score += 3;
  if (p.coverImage) score += 2;
  if (p.about && p.about.trim().length > 0) score += 2;
  if (p.timings) score += 1;
  if (typeof p.preacherRank === "number") score += 1;

  score += (p.fitnessGoals?.length || 0) * 2;
  score += (p.ambition?.length || 0) * 2;
  score += (p.exerciseGenre?.length || 0) * 2;
  score += (p.milestones?.length || 0) * 1;

  if (p.socialHandles) {
    score += Object.values(p.socialHandles).filter(Boolean).length;
  }

  return score;
}


router.post("/cleanup-duplicate-profiles-smart", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const duplicates = await Profile.aggregate([
      {
        $group: {
          _id: "$userId",
          profiles: { $push: "$$ROOT" },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);

    let usersFixed = 0;
    let profilesDeleted = 0;

    for (const dup of duplicates) {
      const profiles = dup.profiles;

      // Pick best profile by score
      let bestProfile = profiles[0];
      let bestScore = scoreProfile(bestProfile);

      for (const p of profiles) {
        const s = scoreProfile(p);
        if (s > bestScore) {
          bestScore = s;
          bestProfile = p;
        }
      }

      const toDelete = profiles
        .filter(p => p._id.toString() !== bestProfile._id.toString())
        .map(p => p._id);

      // Delete junk profiles
      if (toDelete.length) {
        await Profile.deleteMany(
          { _id: { $in: toDelete } },
          { session }
        );
        profilesDeleted += toDelete.length;
      }

      // Fix User.profile reference
      await User.updateOne(
        { _id: dup._id },
        { profile: bestProfile._id },
        { session }
      );

      usersFixed++;
    }

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      usersFixed,
      profilesDeleted
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Smart cleanup failed"
    });
  }
});


router.get("/duplicate-profiles", async (req, res) => {
  try {
    const duplicates = await Profile.aggregate([
      {
        $group: {
          _id: "$userId",
          profiles: { $push: "$$ROOT" },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gt: 1 } } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          count: 1,
          user: {
            _id: "$user._id",
            username: "$user.username",
            email: "$user.email"
          },
          profiles: 1
        }
      }
    ]);

    res.json({
      success: true,
      usersWithDuplicateProfiles: duplicates.length,
      data: duplicates
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});



router.post("/:userId", upload, async (req, res) => {
  try {
 const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


    const fetchedProfile = await Profile.findOne({userId : req.params.userId}) ;
    if(fetchedProfile){
       user.profile = fetchedProfile._id;
    user.onboardingCompleted = true; 
    await user.save();
      return res.status(200).json({
        profile : fetchedProfile, message: "Profile fetched successfully", user

      })
    }

    const profileImageUrl = req.files?.profileImage?.[0]?.path || null;
    const coverImageUrl = req.files?.coverImage?.[0]?.path || null;

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

   

    const profile = new Profile(profileData);
    await profile.save();

    user.profile = profile._id;
    user.onboardingCompleted = true; 
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
      console.log('Fetching profile for userId:', req.params.userId);
        const profile = await Profile.findOne({ userId: req.params.userId })
      .populate({
        path: "userId",
        populate: {
          path: "partner",
          select: "_id profile name username profileImage preacherScore", 
          populate :{
            path : "profile",
            select : "profileImage"

          }
        }
      });

      console.log('fetched profile ', profile );
        if (!profile) {
          console.log('profile not found ');
            return res.status(404).json({ message: "Profile not found" });
        }
        console.log('Profile found:', profile);
        res.status(200).json({ message : "Profile fetched successfully", profile:profile });
    } catch (error) {
      console.error("Error fetching profile:", error);
        res.status(500).json({ error: error.message });
    }
});


router.put("/:userId", upload, async (req, res) => {
  try {
    const profileImageUrl = req.files?.profileImage?.[0]?.path;
    const coverImageUrl = req.files?.coverImage?.[0]?.path;

    // Safely parse array fields from stringified values
    const fitnessGoals = JSON.parse(req.body.fitnessGoals || "[]");
    const ambition = JSON.parse(req.body.ambition || "[]");
    const exerciseGenre = JSON.parse(req.body.exerciseGenre || "[]");

    const updateData = {
      about: req.body.about || "",
      socialHandles : req.body.socialHandles || {},
      fitnessGoals,
      ambition,
      timings : req.body.timings || "" ,
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


   emitProfileUpdate(profile);
   await notificationService.sendNotification(
  user,
  "Your profile has been updated successfully",
  "Profile Updated ✨",
  "info",
  "profile",
  `/profile/${user._id}`
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
