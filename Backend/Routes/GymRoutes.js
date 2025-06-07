const express = require('express');
const router = express.Router();
const Gym = require('../Models/GymSchema');
const { upload } = require('../config/cloudinary');
const User = require('../Models/User');

router.post('/create', upload, async (req, res) => {
    try {
        const { name, location, description, rating, reviews, facilities, equipment, membership, members, trainers, owner } = req.body;

        // Extract images from uploaded files
        const image = req.files?.image ? req.files.image[0].path : null;
        const profileImage = req.files?.profileImage ? req.files.profileImage[0].path : null;

        // Generate unique gym code
        let gymCode;
        let existingGym;
        do {
            gymCode = Math.floor(100000 + Math.random() * 900000).toString();
            existingGym = await Gym.findOne({ gymCode });
        } while (existingGym);

        const gym = new Gym({ 
            name,
            location,
            image,
            profileImage,
            description,
            rating,
            reviews,
            facilities,
            equipment,
            membership,
            members,
            trainers,
            owner,
            memberSince: new Date(),
            gymCode
        });

        await gym.save();
        res.status(201).json(gym);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

router.get('/join/:gymCode/:userId' , async(req,res)=>{
    try {
        const {gymCode, userId} = req.params;
        const foundGym = await Gym.findOne({gymCode});
        const foundUser = await User.findById(userId);
        
        if(!foundGym || !foundUser){
            return res.status(404).json({message:"Gym or User not found"});
        }

        // Check if user is already a member
        const isAlreadyMember = foundGym.members.some(member => member.toString() === userId);
        if(isAlreadyMember) {
            return res.status(400).json({message: "Already a Member of the Clan"});
        }

        foundGym.members.push(foundUser);
        await foundGym.save();
        res.status(200).json({message:"Joined Gym successfully", gym: foundGym});
    } catch (error) {
        console.error(error);
        res.status(500).json({message:"Internal server error"});
    }
});

router.get('/all', async (req, res) => {
    try {
        const gyms = await Gym.find().populate('members', '-password -__v');
        res.status(200).json(gyms);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
