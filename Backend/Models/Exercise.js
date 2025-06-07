const ExerciseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    image: { type: String }, 
    description: { type: String },
    caloriesBurned: { type: Number },
    genre: { type: String, enum: ["Cardio", "Weight Training"], required: true }
});

const Exercise = mongoose.model("Exercise", ExerciseSchema);
module.exports = Exercise;