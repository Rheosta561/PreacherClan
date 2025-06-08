const express = require('express');
const router = express.Router();
const Gym = require('../Models/GymSchema');
const { upload } = require('../config/cloudinary');
const User = require('../Models/User');
const updatePreacherScore = require('../Utils/updatePreacherScore');
const notificationService = require('../Utils/NotificationService');
const {updateStreak} = require('../Utils/updateStreak');
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

router.get('/streak/:gymCode/:userId' , async(req,res)=>{
    try {
        const { gymCode } = req.params;
        const userId = req.params.userId;
        const gym = await Gym.findOne({ gymCode }).populate('members');
        if (!gym) {
            return res.status(404).json({ message: "Gym not found" });
        }
        const isMember = gym.members.some(member => member._id.toString() === userId);
        if (!isMember) {
            return res.status(403).json({ message: "You are not a member of this gym" });
        }
        const currStreak = await updateStreak(userId);
        return res.status(200).json({message : "Streak updated" , gym  , currStreak:'' + currStreak});
;

        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
        
    }
} );

router.get('/gym/:gymId', async (req, res) => {
    try {
        
        const gym = await Gym.findOne({ _id: req.params.gymId })
            .populate({
                path: 'members',
                populate: { path: 'profile' }
            });

        if (!gym) {
            return res.status(404).json({ message: "Gym Not Found" });
        }

        return res.status(200).json({ gym });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Something went wrong", error: error.message });
    }
});



module.exports = router;
