const express = require('express');
const router = express.Router();
const Gym = require('../Models/GymSchema');
const User = require('../Models/User');
const EntryLog = require('../Models/EntryLog');
const authMiddleware = require('../Middleware/auth');
const { upload } = require('../config/cloudinary');

const gymPopulation = [
    { path: 'members', select: '-password -__v' },
    { path: 'trainers', select: '-password -__v' },
    { path: 'owner', select: '-password -__v' },
];

router.get('/featured', async (req, res) => {
    try {
        const gyms = await Gym.find({ $or: [{ featured: true }, { rating: { $gte: 4.5 } }] }).sort({ featured: -1, rating: -1 }).limit(20);
        res.status(200).json({ gyms });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

router.get('/:gymId([0-9a-fA-F]{24})', async (req, res) => {
    try {
        const gym = await Gym.findById(req.params.gymId).populate(gymPopulation);
        if (!gym) {
            return res.status(404).json({ message: 'Gym not found' });
        }

        return res.status(200).json({ gym });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message })
    }
});

router.post('/entry/access', authMiddleware, async (req, res) => {
    try {
        const { gymId, gymCode } = req.body;
        const gym = gymId
            ? await Gym.findById(gymId)
            : await Gym.findOne({ gymCode });
        const user = await User.findById(req.user.id).populate('profile');

        if (!gym || !user) {
            return res.status(404).json({ message: 'Gym or User not found' });
        }

        const isMember = gym.members.some((member) => member.toString() === String(user._id));
        if (!isMember || String(user.gym) !== String(gym._id)) {
            return res.status(403).json({ message: 'User is not an active member of this gym' });
        }

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const alreadyCheckedIn = await EntryLog.exists({
            gymId: gym._id,
            memberUserId: user._id,
            actionType: 'check_in',
            occurredAt: { $gte: startOfDay },
        });

        if (!alreadyCheckedIn) {
            await EntryLog.create({
                gymId: gym._id,
                memberUserId: user._id,
                memberNameSnapshot: user.name,
                memberUsernameSnapshot: user.username,
                actionType: 'check_in',
                status: 'Checked In',
                source: 'Mobile',
                occurredAt: new Date(),
                createdBy: { actorType: 'user', actorId: user._id },
            });
            user.streak = (user.streak || 0) + 1;
            await user.save();
        }

        return res.status(200).json({
            message: alreadyCheckedIn ? 'Gym entry already recorded today' : 'Gym entry recorded successfully',
            gym: gym.name,
            gymId: gym._id,
            currStreak: user.streak,
            streakUpdated: !alreadyCheckedIn,
            workoutHitsPerWeek: user.workoutHitsPerWeek || 0,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
});

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
