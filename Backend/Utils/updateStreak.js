const User = require("../Models/User");
const updateStreak = async(userId)=>{
    try {
        const user = await User.findOne({ _id:userId });
        if (!user) {
            throw new Error("User not found");
        }
       const currStreak = user.streak || 0;
       const weeklyHits = user.workoutHitsPerWeek || 0;
       updatedWeeklyHits = weeklyHits + 1;
         user.workoutHitsPerWeek = updatedWeeklyHits;
        const updatedStreak = currStreak + 1;
        user.streak = updatedStreak;
        await user.save();
        return updatedStreak;
    } catch (error) {
        console.error("Error updating streak:", error);
        throw error;
    }

}
module.exports = {updateStreak};