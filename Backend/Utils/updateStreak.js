const User = require("../Models/User");
const NotificationService = require("../Utils/NotificationService");
const updateStreak = async(userId)=>{
    try {
        
        const user = await User.findOne({ _id:userId });
        if (!user) {
            throw new Error("User not found");
        }
        if(user.streak.todayUpdated){
            await NotificationService.sendNotification(user, "You have already updated your streak for today. Keep up the good work!", "info");
            return user.streak.count || 0;
        }
       const currStreak = user.streak.count || 0;
       const weeklyHits = user.workoutHitsPerWeek || 0;
       updatedWeeklyHits = weeklyHits + 1;
         user.workoutHitsPerWeek = updatedWeeklyHits;
        const updatedStreak = currStreak + 1;
        user.streak.count = updatedStreak;
        user.streak.todayUpdated = true; // Mark today's streak as updated
        await user.save();
        // Send notification to the user
        const message = `🔥 Streak Updated! Your current streak is now ${updatedStreak} . Keep up the great work! 💪`;
        await NotificationService.sendNotification(user, message, "info");

        return updatedStreak;

    } catch (error) {
        console.error("Error updating streak:", error);
        throw error;
    }

}
module.exports = {updateStreak};