const express = require('express');
const router = express.Router();
const Gym = require('../Models/GymSchema');
const { upload } = require('../config/cloudinary');
const User = require('../Models/User');
const updatePreacherScore = require('../Utils/updatePreacherScore');
const notificationService = require('../Utils/NotificationService');

// push notifications
const {sendExpoPush} = require('../Utils/sendExpoPush');

const {updateStreak} = require('../Utils/updateStreak');
const { getDistanceMeters } = require("../Utils/location");
const {
  createEntryLog,
} = require('../Services/entryLogsService');

const GYM_ENTRY_RADIUS_METERS = Number(process.env.GYM_ENTRY_RADIUS_METERS || 5);

const handleLocationBasedEntryAccess = async (req, res) => {
  const requestedUserId = req.body.userId;
  const userId = req.user?.id || requestedUserId;
  const gymCode = req.body.gymCode;
  const gymId = req.body.gymId;

  if (!userId) {
    return res.status(401).json({ message: "User authentication is required" });
  }

  if (requestedUserId && String(requestedUserId) !== String(userId)) {
    return res.status(403).json({ message: "You can only check in for your own account" });
  }

  if (!gymCode && !gymId) {
    return res.status(400).json({ message: "gymCode or gymId is required" });
  }

  const gymQuery = gymId ? { _id: gymId } : { gymCode };
  const gym = await Gym.findOne(gymQuery).populate("members");
  if (!gym) {
    return res.status(404).json({ message: "Gym not found" });
  }

  const isMember = gym.members.some((member) => member._id.toString() === String(userId));
  if (!isMember) {
    return res.status(403).json({
      message: "You are not a member of this gym",
    });
  }

  const user = await User.findById(userId).select("location");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const gymLatitude = gym.address?.latitude ?? gym.address?.lattitude;
  const gymLongitude = gym.address?.longitude;
  const userLongitude = user.location?.coordinates?.[0];
  const userLatitude = user.location?.coordinates?.[1];

  if (!Number.isFinite(Number(gymLatitude)) || !Number.isFinite(Number(gymLongitude))) {
    return res.status(422).json({
      message: "Gym location is not configured for entry validation",
    });
  }

  if (!Number.isFinite(Number(userLatitude)) || !Number.isFinite(Number(userLongitude))) {
    return res.status(422).json({
      message: "User location is required for gym entry validation",
    });
  }

  const distanceMeters = getDistanceMeters(
    userLatitude,
    userLongitude,
    gymLatitude,
    gymLongitude
  );

  if (distanceMeters == null) {
    return res.status(422).json({
      message: "Unable to validate location for gym entry",
    });
  }

  if (distanceMeters > GYM_ENTRY_RADIUS_METERS) {
    await createEntryLog({
      gymId: gym._id,
      memberUserId: userId,
      actionType: "check_in",
      source: "Mobile",
      status: "Denied",
      occurredAt: new Date(),
      notes: `Denied: user is ${distanceMeters.toFixed(2)}m away from gym`,
      createdBy: {
        actorType: "user",
        actorId: userId,
      },
    });

    return res.status(403).json({
      message: `You must be within ${GYM_ENTRY_RADIUS_METERS} meters of the gym to check in`,
      distanceMeters: Number(distanceMeters.toFixed(2)),
      allowedRadiusMeters: GYM_ENTRY_RADIUS_METERS,
    });
  }

  await createEntryLog({
    gymId: gym._id,
    memberUserId: userId,
    actionType: "check_in",
    source: "Mobile",
    status: "Checked In",
    occurredAt: new Date(),
    createdBy: {
      actorType: "user",
      actorId: userId,
    },
  });

  const streakResult = await updateStreak(userId);

  return res.status(200).json({
    message: "Entry recorded successfully",
    gym: gym.name,
    gymId: gym._id,
    distanceMeters: Number(distanceMeters.toFixed(2)),
    currStreak: streakResult.streakCount,
    streakUpdated: streakResult.updatedToday,
    workoutHitsPerWeek: streakResult.workoutHitsPerWeek,
  });
};

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
    return res.status(410).json({
      message: "This endpoint is deprecated. Use POST /gym/entry/access with location validation.",
    });
} );

router.post("/qr/generate", async (req, res) => {
  return res.status(410).json({
    message: "QR-based gym entry is deprecated. Use POST /gym/entry/access with location validation.",
  });
});

router.post("/entry/access", async (req, res) => {
  try {
    return handleLocationBasedEntryAccess(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.post("/streak/scan", async (req, res) => {
  try {
    return handleLocationBasedEntryAccess(req, res);
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
