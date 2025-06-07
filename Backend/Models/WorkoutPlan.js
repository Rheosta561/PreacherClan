const WorkoutPlanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    muscleGroups: [{ type: String }],
    planType: { type: String, enum: ["Strength", "Hypertrophy", "Endurance"], required: true },
    day:{ type: String, enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], required: true }, 
    exercises: [{ type: mongoose.Schema.Types.ObjectId, ref: "Exercise" }] 
});

const WorkoutPlan = mongoose.model("WorkoutPlan", WorkoutPlanSchema);
module.exports = WorkoutPlan;