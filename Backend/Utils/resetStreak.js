const cron = require('node-cron');
const User = require('../Models/User');
const resetStreak = async()=>{
    try {
        const users = await User.find();
        const result = await User.updateMany({}, {$set: {'streak.todayUpdated':false}});
        console.log(`Streak reset for ${result.modifiedCount} users.`);
        
        
    } catch (error) {
        console.error('Error during streak reset:', error);
    }
}

module.exports = resetStreak;