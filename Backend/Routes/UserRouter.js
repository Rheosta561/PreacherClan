const expres = require('express');
const router = expres.Router();
const User = require('../Models/User');
const {userImage} = require('../Manipulations/UserImage');


router.get('/:userId' , async(req,res)=>{
    try {
        const user = await User.findById(req.params.userId).select('-password -__v').populate('partner');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
        
    }
});

router.post("/location", async (req, res) => {
  const { latitude, longitude ,userId } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ message: "Invalid coordinates" });
  }

  const user = await User.findByIdAndUpdate(userId, {
    location: {
      type: "Point",
      coordinates: [longitude, latitude],
      updatedAt: new Date(),
    },
  });

  console.log(user.location);

  res.json({ success: true });
});



module.exports = router;