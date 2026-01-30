const express = require('express');
const router = express.Router()

const User = require('../Models/User');
const {generateVikingChallenge} = require('../Utils/createChallengeUtil')
const auth = require('../Middleware/auth');
router.use('*' , auth);


router.post("/challenge-of-the-day/:userId", async (req, res) => {
  try {


    const userId = req.params.userId
    const { exercises = [] } = req.body; 

    // console.log('exercises received' , exercises);

    // get today's day name
const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

// filter exercises for today
// const todaysExercises = (exercises || []).filter(ex => ex.day === todayName);
// console.log('today name' , todayName);

const dayMap = {
  'Mo': 'Monday',
  'Tu': 'Tuesday',
  'We': 'Wednesday',
  'Th': 'Thursday',
  'Fr': 'Friday',
  'Sa': 'Saturday',
  'Su': 'Sunday'
};

const normalizedExercises = exercises.map(ex => ({
  ...ex,
  day: dayMap[ex.day] || ex.day
}));

const todaysExercises = (normalizedExercises || []).filter(ex => ex.day === todayName);
// console.log('today exercises' , todaysExercises);
// fallback
if (!todaysExercises.length) {
  return res.json({
    fromCache:false,
    challenge:{
      title:"Day of Recovery — Viking Restoration Ritual",
      description:"Even the fiercest warriors must rest to rise stronger.",
      rules:[
        "Walk 20 minutes",
        "Stretch for 10 minutes",
        "Hydrate like a Viking"
      ],
      createdAt:new Date(),
      isCompleted:false
    }
  });
}




    const user = await User.findById(userId);

    // console.log(user);

    if (!user) return res.status(404).json({ error: "User not found" });

// checking for today's challenge
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // console.log(today)

    const todaysChallenge = user.challenges?.find(ch =>
      ch.createdAt && new Date(ch.createdAt).setHours(0,0,0,0) === today.getTime()
    );

    // console.log(todaysChallenge);

    if (todaysChallenge) {
      return res.json({
        fromCache: true,
        challenge: todaysChallenge
      });
    }

// generating new challenge 
    const challengeAI = await generateVikingChallenge(todaysExercises);

    console.log('challenge ,' , challengeAI)

    const newChallenge = {
      title: challengeAI.title,
      description: challengeAI.description,
      rules: challengeAI.rules,
      createdAt: new Date(),
      isCompleted: false
    };

// svae to the user 
    user.challenges.push(newChallenge);
    await user.save();

    res.json({
      fromCache: false,
      challenge: newChallenge
    });

  } catch (err) {
    console.error("Challenge error:", err);
    res.status(500).json({ error: "Failed to get challenge" });
  }
});


router.post("/complete/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ error: "User not found" });
    // today
    const today = new Date();
    today.setHours(0,0,0,0);

    const userChallenges = user.challenges || [];
    console.log('user challenges' , userChallenges);

    // today's challnege 
    const todaysChallenge = user.challenges?.find(ch => {
      if (!ch?.createdAt) return false;
      const created = new Date(ch.createdAt);
      created.setHours(0,0,0,0);
      return created.getTime() === today.getTime();
    });



    if (!todaysChallenge) {
      return res.status(400).json({ error: "No challenge found for today" });
    }

// precheck
    if (todaysChallenge.isCompleted) {
      return res.status(201).json({
        message: "Challenge already completed",
        preacherScore: user.preacherScore,
        challenge: todaysChallenge
      });
    }


    todaysChallenge.isCompleted = true;

// add preacherScore
    user.preacherScore = (user.preacherScore || 0) + 20;

    await user.save();

    res.status(200).json({
      message: "Challenge completed",
      preacherScore: user.preacherScore,
      challenge: todaysChallenge
    });

  } catch (err) {
    console.error("Challenge completion error:", err);
    res.status(500).json({ error: "Failed to complete challenge" });
  }
});

module.exports = router;


