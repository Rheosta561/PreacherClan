
const { getIo , onlineUsers } = require('../socket');
const Profile = require('../Models/Profile');

const sendMatchNotification = async(User, matchUser) => {
    const io = getIo();
    const userId = User._id.toString();
    const receiverId = onlineUsers.get(userId);
    if (!receiverId) {
        console.log(`User ${User.name} is not online.`);
        return;
    }
    const matchUserProfile = await Profile.findById(matchUser._id);
    io.to(receiverId).emit('matchAccepted', {
        matchUserData: {
            name: matchUser.name,
            image : matchUserProfile?.profileImage,
            _id: matchUser._id,
        }
    });
    console.log(`Match notification sent to ${User.name} for match with ${matchUser.name}`);
    }
module.exports = {
    sendMatchNotification,
};

