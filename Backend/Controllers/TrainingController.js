const TrainingSession = require("../Models/TrainingSession");
const User = require("../Models/User");

// Start or resume a training session
exports.startOrResumeSession = async (req, res) => {
  try {
    const { userId, splitId, day } = req.body;

    if (!userId || !splitId || !day) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    let session = await TrainingSession.findOne({
      userId,
      splitId,
      day,
      status: "in_progress",
    });

    if (!session) {
      session = new TrainingSession({
        userId,
        splitId,
        day,
        status: "in_progress",
        currentExerciseIndex: 0,
        currentExerciseTimeTaken: 0,
        exerciseStats: [],
      });
      await session.save();
    }

    res.status(200).json({ success: true, session });
  } catch (error) {
    console.error("Error starting/resuming session:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update progress during the session
exports.updateProgress = async (req, res) => {
  try {
    const { sessionId, currentExerciseIndex, currentExerciseTimeTaken, exerciseStats } = req.body;

    const session = await TrainingSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found." });
    }

    if (session.status !== "in_progress") {
      return res.status(400).json({ success: false, message: "Session is not in progress." });
    }

    session.currentExerciseIndex = currentExerciseIndex;
    session.currentExerciseTimeTaken = currentExerciseTimeTaken;
    if (exerciseStats) {
      session.exerciseStats = exerciseStats;
    }

    await session.save();

    res.status(200).json({ success: true, session });
  } catch (error) {
    console.error("Error updating progress:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Complete a training session
exports.completeSession = async (req, res) => {
  try {
    const { sessionId, exerciseStats } = req.body;

    const session = await TrainingSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found." });
    }

    if (session.status !== "in_progress") {
      return res.status(400).json({ success: false, message: "Session is already completed or cancelled." });
    }

    if (exerciseStats) {
      session.exerciseStats = exerciseStats;
    }

    session.status = "completed";
    session.completedAt = new Date();

    // Check if user already got Preacher Score today for training
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const alreadyAwardedToday = await TrainingSession.findOne({
      userId: session.userId,
      preacherScoreAwarded: true,
      completedAt: { $gte: startOfDay, $lte: endOfDay },
    });

    let scoreAwardedNow = false;
    if (!alreadyAwardedToday) {
      // Award 10 points
      await User.findByIdAndUpdate(session.userId, {
        $inc: { preacherScore: 10 },
      });
      session.preacherScoreAwarded = true;
      scoreAwardedNow = true;
    }

    await session.save();

    res.status(200).json({ success: true, session, scoreAwarded: scoreAwardedNow });
  } catch (error) {
    console.error("Error completing session:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Cancel/End prematurely
exports.cancelSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await TrainingSession.findByIdAndUpdate(
      sessionId,
      { status: "cancelled", completedAt: new Date() },
      { new: true }
    );
    res.status(200).json({ success: true, session });
  } catch (error) {
    console.error("Error cancelling session:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
