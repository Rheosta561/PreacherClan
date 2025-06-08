const {getIo , onlineUsers} = require('../socket');
const emitProfileUpdate = (profile) => {
    console.log(`Emitting profile update for user ${profile.userId}`);
    const io = getIo();
    const userId = profile.userId.toString();
    if (onlineUsers.has(profile.userId.toString())) {
        
        console.log(`Emitting profile update for user ${userId}`);
        const socketId = onlineUsers.get(userId);
        io.to(socketId).emit('profileUpdated', profile);
    } else {
        console.log(`User ${userId} is not online.`);
    }
}
module.exports = {emitProfileUpdate};