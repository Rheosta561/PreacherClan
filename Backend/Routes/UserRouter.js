const expres = require('express');
const router = expres.Router();
const User = require('../Models/User');

router.get('/:userId' , async(req,res)=>{
    try {
        const user = await User.findById(req.params.userId)
            .select('-password -__v')
            .populate('gym', '_id name');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
        
    }
});

router.patch('/:userId/age', async (req, res) => {
    try {
        const { age } = req.body;
        if (typeof age !== 'number' || age <= 0) {
            return res.status(400).json({ message: 'Invalid age' });
        }
        const user = await User.findByIdAndUpdate(req.params.userId, { age }, { new: true });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'Age updated successfully', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:userId/onboard', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.userId, { onboardingCompleted: true }, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'Onboarding marked completed', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;