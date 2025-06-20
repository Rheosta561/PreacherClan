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


module.exports = router;