const express = require('express');
const router = express.Router();
const Gym = require('../Models/GymSchema');
const { upload } = require('../config/cloudinary');
const User = require('../Models/User');
const updatePreacherScore = require('../Utils/updatePreacherScore');
const notificationService = require('../Utils/NotificationService');

const encryptPayload = require("../Utils/encrypt");
const decryptPayload = require("../Utils/decrypt");


// push notifications
const {sendExpoPush} = require('../Utils/sendExpoPush');

const {updateStreak} = require('../Utils/updateStreak');
router.post('/create', upload, async (req, res) => {
  try {
    const {
      name,
      location,
      description,
      rating,
      facilities,
      equipment,
      membership,
      owner,

      // optional nested
      country,
      state,
      city,
      lattitude,
      longitude,
      email,
      phone,

    //   arrays of object ids
      trainers,
      members,
    } = req.body;


// files 
    const image = req.files?.image?.[0]?.path || null;
    const profileImage = req.files?.profileImage?.[0]?.path || null;

    const gallery = req.files?.gallery?.map(f => f.path) || [];


// arrays
    const facilitiesArr = facilities ? facilities.split(',') : [];
    const equipmentArr  = equipment  ? equipment.split(',') : [];
    const membershipArr = membership ? membership.split(',') : [];


// ids
    const trainersArr = trainers ? JSON.parse(trainers) : [];
    const membersArr  = members  ? JSON.parse(members)  : [];


// unique gym code 
    let gymCode;
    let existingGym;
    do {
      gymCode = Math.floor(100000 + Math.random() * 900000).toString();
      existingGym = await Gym.findOne({ gymCode });
    } while (existingGym);


// create 
    const gym = new Gym({
      name,
      location,
      image,
      profileImage,
      gallery,
      description,
      rating,
      facilities: facilitiesArr,
      equipment: equipmentArr,
      membership: membershipArr,
      trainers: trainersArr,
      members: membersArr,
      owner,

      address: {
        country,
        state,
        city,
        lattitude,
        longitude,
      },

      contact: {
        email,
        phone,
      },

      memberSince: new Date(),
      gymCode,
      featured: false,
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
        const gyms = await Gym.find().populate('members', '-password -__v' , 'co');
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

router.post("/qr/generate", async (req, res) => {
  try {
    const { gymCode } = req.body;

    if (!gymCode) {
      return res.status(400).json({ message: "gymCode is required" });
    }

//validation
    const gym = await Gym.findOne({ gymCode });
    if (!gym) {
      return res.status(404).json({ message: "Gym not found" });
    }

    //payload 
    const payload = {
      gymCode,
      issuedAt: Math.floor(Date.now() / 1000),
    };

// encryption
    const encrypted = encryptPayload(payload);

// deep link for app routing
    const deepLink = `https://preacherclan.in/clan?qr=${encodeURIComponent(
      encrypted
    )}`;

    return res.status(200).json({
      message: "Encrypted QR generated",
      encrypted,
      deepLink,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

router.post("/streak/scan",  async (req, res) => {
  try {
    const { encrypted } = req.body;
    const {userId} = req.body;


    if (!encrypted) {
      return res.status(400).json({ message: "QR data missing" });
    }

    //Decrypt QR
    let payload;
    try {
      payload = decryptPayload(encrypted);
    } catch {
      return res.status(400).json({ message: "Invalid QR code" });
    }

    const { gymCode, issuedAt } = payload;

   

    // Find gym
    const gym = await Gym.findOne({ gymCode }).populate("members");
    if (!gym) {
      return res.status(404).json({ message: "Gym not found" });
    }

    // console.log(gym);

    // Membership check
    const isMember = gym.members.some(
      (m) => m._id.toString() === userId
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this gym",
      });
    }


    const currStreak = await updateStreak(userId)

    return res.status(200).json({
      message: "Streak updated successfully",
      gym: gym.name,
      currStreak,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/gym/:gymId', async (req, res) => {
    try {
        
        const gym = await Gym.findOne({ _id: req.params.gymId })
            .populate({
                path: 'members owner',
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
router.get('/featured', async(req, res)=>{
    try {
        const featuredGyms = await Gym.find({featured:true});
        if(featuredGyms.length>0){
            return res.status(200).json({gyms : featuredGyms});
        }

        const allGyms = await Gym.find().sort({rating : -1}).limit(10);
        return res.status(201).json({gyms : allGyms});
        
    } catch (error) {
        return res.status(500).json({message : 'Something went wrong' , error});
        
    }


});



module.exports = router;
