const express = require("express");
const Profile = require("../Models/Profile");
const router = express.Router();
const User = require("../Models/User");


router.post("/:userId", async (req, res) => {
    try {
        const existingProfile = await Profile.findOne({userId: req.params.userId});
        if(existingProfile){
            return res.status(400).json({message:"Profile Already Exists"});
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
        res.status(201).json({profile , message: "Profile created successfully" , user});
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


router.get("/:userId", async (req, res) => {
    try {
        const profile = await Profile.findOne({ userId: req.params.userId })
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }
        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.put("/:userId", async (req, res) => {
    try {
        const profile = await Profile.findOneAndUpdate(
            { userId: req.params.userId },
            req.body,
            { new: true, runValidators: true , upsert:true }
        );
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }
        res.json(profile);
    } catch (error) {
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
