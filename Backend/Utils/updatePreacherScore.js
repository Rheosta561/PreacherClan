const user = require("../Models/User");
const updatePreacherScore = async(userId)=>{
    try {
        const userData = await user.findOne({_id:userId});
        if (!userData) {
            throw new Error("User not found");
        }
        const currentScore = userData.preacherScore || 0;
        const weeklyHits = userData.workoutHitsPerWeek || 0;
        const updatedScore = currentScore + (weeklyHits * 10); // Assuming each hit adds 10 points
        userData.preacherScore = updatedScore;
        await userData.save();
        return updatedScore;
        
    } catch (error) {
        console.error("Error updating preacher score:", error);
        throw error;
        
    }
}

module.exports = { updatePreacherScore };