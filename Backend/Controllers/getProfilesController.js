const user = require('../Models/User');
const request = require('../Models/Requests');

const getProfiles = async (req, res) => {
    try {
        const User = await user.find({}).populate('profile').populate('gym');
        if (!User || User.length === 0) {
            return res.status(404).json({ message: "No profiles found" });
        }

        const profiles = User.map(user => ({
            userId: user._id,
            name: user.name,
            profileImage: user.profile ? user.profile.profileImage : null,
            coverImage: user.profile ? user.profile.coverImage : null,
            about: user.profile ? user.profile.about : null,
            socialHandles: user.profile ? user.profile.socialHandles : {},
            fitnessGoals: user.profile ? user.profile.fitnessGoals : [],
            ambition: user.profile ? user.profile.ambition : [],
            exerciseGenre: user.profile ? user.profile.exerciseGenre : [],
            preacherRank: user.profile ? user.profile.preacherRank : 0,
            isVerified: user.isVerified,
            isTrainer: user.isTrainer,
            gym: user.gym?.name || null,
            followersCount: user.followers ? user.followers.length : 0,
            friends : user.partner ? user.partner.map(partner => ({
                id: partner._id,
                name: partner.name, }) ) : [],

        }));
        return res.status(200).json({ profiles });

        
    } catch (error) {
        console.error("Error fetching profiles:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
        
    }
}
const getProfileById = async (req, res) => {
    try {
        const { userId } = req.params;   
        
        // 1. Find the user
        const User = await user.findById(userId).populate('profile').populate('gym').populate('partner');
        if (!User) {
            return res.status(404).json({ message: "Profile not found" });
        }

        // 2. Fetch all requests where this user is either sender or receiver
         const requests = await request.find({
            $or: [
                { 'sender': userId },
                { 'receiver': userId }
            ]
        });

        // 3. Build set of involved userIds
        const involvedUserIds = new Set();
        requests.forEach(req => {
            involvedUserIds.add(req.sender.toString());
            involvedUserIds.add(req.receiver.toString());
        });

        // 4. Fetch all other users (exclude involved + current user)
        const otherUsers = await user.find({
            _id: { 
                $nin: Array.from(involvedUserIds).concat([userId]) 
            }
        }).populate('profile').populate('gym');

        // 5. Build profiles list
        const profiles = otherUsers.map(user => ({
            userId: user._id,
            name: user.name,
            profileImage: user.profile ? user.profile.profileImage : null,
            coverImage: user.profile ? user.profile.coverImage : null,
            about: user.profile ? user.profile.about : null,
            socialHandles: user.profile ? user.profile.socialHandles : {},
            fitnessGoals: user.profile ? user.profile.fitnessGoals : [],
            ambition: user.profile ? user.profile.ambition : [],
            exerciseGenre: user.profile ? user.profile.exerciseGenre : [],
            preacherRank: user.profile ? user.profile.preacherRank : 0,
            isVerified: user.isVerified,
            isTrainer: user.isTrainer,
            gym: user.gym?.name || null,
            followersCount: user.followers ? user.followers.length : 0,
            friends: user.partner ? user.partner.map(partner => ({
                id: partner._id,
                name: partner.name,
            })) : [],
        }));

        // 6. Return the profiles
        console.log("Filtered profiles:", profiles);
        return res.status(200).json({ profiles });

    } catch (error) {
        console.error("Error fetching profile by ID with filtered profiles:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};


module.exports = {
    getProfiles , getProfileById
};