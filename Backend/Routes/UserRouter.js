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
  const authenticatedUserId = req.user?.id || userId;

  if (
    !Number.isFinite(Number(latitude)) ||
    !Number.isFinite(Number(longitude))
  ) {
    return res.status(400).json({ message: "Invalid coordinates" });
  }

  if (!authenticatedUserId) {
    return res.status(401).json({ message: "User authentication is required" });
  }

  if (userId && String(userId) !== String(authenticatedUserId)) {
    return res.status(403).json({ message: "You can only update your own location" });
  }

  const user = await User.findByIdAndUpdate(authenticatedUserId, {
    location: {
      type: "Point",
      coordinates: [Number(longitude), Number(latitude)],
      updatedAt: new Date(),
    },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ success: true });
});



module.exports = router;
