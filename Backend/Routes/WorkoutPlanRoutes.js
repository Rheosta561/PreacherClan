const WorkoutPlan = require('../Models/WorkoutPlan');
const express = require('express');
const router = express.Router();
const User = require('../Models/User');

// Create a new workout plan
router.put('/:userId', async (req, res) => {
    try {
        const workoutPlan = await WorkoutPlan.findOneAndUpdate(
            {userId: req.params.userId},
            req.body,
            { new: true,  upsert: true }
        )
        return res.status(201).json({ workoutPlan, message: "Workout plan created/updated successfully" });
        
    } catch (error) {
        return res.status(400).json({ error: error.message });
        
    }
});
// Get a workout plan by user ID
router.get('/:userId', async (req, res) => {
    try {
        const workoutPlan = await WorkoutPlan.findOne({ userId: req.params.userId }).populate('exercises.exerciseId');
        if (!workoutPlan) {
            return res.status(404).json({ message: "Workout plan not found" });
        }
        return res.json(workoutPlan);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});