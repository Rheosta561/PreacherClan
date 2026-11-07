const expres = require('express');
const router = expres.Router();
const User = require('../Models/User');
const { getPolicyVersions } = require('../Services/legalPolicyService');
const auth = require('../Middleware/auth');

const requireOwnUser = (req, res, next) => {
    if (String(req.user?.id) !== String(req.params.userId)) return res.status(403).json({ message: 'Forbidden' });
    return next();
};

router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password -__v')
            .populate('gym', '_id name');
        if (!user) return res.status(404).json({ message: 'User not found' });
        return res.json(user);
    } catch (error) {
        return res.status(500).json({ message: 'Could not load account' });
    }
});

router.get('/:userId', auth, requireOwnUser, async(req,res)=>{
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

router.patch('/:userId/age', auth, requireOwnUser, async (req, res) => {
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

router.patch('/:userId/onboard', auth, requireOwnUser, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.userId, { onboardingCompleted: true }, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'Onboarding marked completed', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.patch('/:userId/legal-consent', auth, async (req, res) => {
    try {
        if (req.user.id !== req.params.userId) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        if (req.body?.accepted !== true) {
            return res.status(400).json({ message: 'Acceptance is required to continue.' });
        }

        const { termsVersion, privacyPolicyVersion } = getPolicyVersions();
        const user = await User.findByIdAndUpdate(req.params.userId, {
            termsAcceptedAt: new Date(),
            privacyPolicyAcceptedAt: new Date(),
            termsVersion,
            privacyPolicyVersion,
        }, { new: true }).select('termsAcceptedAt privacyPolicyAcceptedAt termsVersion privacyPolicyVersion');
        if (!user) return res.status(404).json({ message: 'User not found' });
        return res.json({
            termsAcceptedAt: user.termsAcceptedAt,
            privacyPolicyAcceptedAt: user.privacyPolicyAcceptedAt,
            termsVersion: user.termsVersion,
            privacyPolicyVersion: user.privacyPolicyVersion,
        });
    } catch (error) {
        return res.status(500).json({ message: 'Could not save policy acceptance' });
    }
});

router.patch('/:userId/split', auth, async (req, res) => {
    try {
        if (req.user.id !== req.params.userId) {
            return res.status(403).json({ message: "Forbidden" });
        }
        const { currentSplitId } = req.body;
        const user = await User.findByIdAndUpdate(req.params.userId, { currentSplitId }, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'Current split updated successfully', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
