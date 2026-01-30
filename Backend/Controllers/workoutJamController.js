const WorkoutJam = require("../Models/WorkoutJamSchema");
const generateJamCode = require("../Utils/generateJamCode");

// create jam 
exports.createJam = async (req, res) => {
  try {
    const { name, leaderId, exercises } = req.body;

    if (!name || !leaderId || !exercises?.length) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const jam = await WorkoutJam.create({
      name,                               // REQUIRED
      jamCode: generateJamCode(),
      leader: leaderId,                   // REQUIRED
      participants: [{ user: leaderId }], // REQUIRED
      exercises,
      state: "lobby",
    });

    return res.status(201).json({
      jamId: jam._id,
      jamCode: jam.jamCode,
      title: jam.name,
    });

  } catch (err) {
    console.error("Create jam error:", err);
    return res.status(500).json({ error: err.message });
  }
};



// join jam http fallback 
exports.joinJam = async (req, res) => {
  try {
    const { jamCode, userId } = req.body;

    if (!jamCode || !userId) {
      return res.status(400).json({ message: "jamCode and userId required" });
    }

    const jam = await WorkoutJam.findOne({ jamCode })
      .populate("leader", "name username profileImage")
      .populate("participants.user", "name username profileImage preacherScore");

    if (!jam) {
      return res.status(404).json({ message: "Jam not found" });
    }

    // Cannot join if jam already started or completed
    if (jam.state !== "lobby") {
      return res.status(400).json({
        message: "Jam already started or completed",
      });
    }

    const alreadyJoined = jam.participants.some(
      p => p.user._id.toString() === userId
    );

    if (!alreadyJoined) {
      jam.participants.push({
        user: userId,
        status: "ready",
        completedExercises: 0,
      });

      await jam.save();
    }

    // Return clean response
    res.status(200).json({
      _id: jam._id,
      name: jam.name,
      jamCode: jam.jamCode,
      state: jam.state,

      leader: jam.leader._id,

      participants: jam.participants.map(p => ({
        _id: p.user._id,
        name: p.user.name,
        username: p.user.username,
        profileImage: p.user.profileImage,
        preacherScore: p.user.preacherScore,
      })),

      exercises: jam.exercises
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(ex => ({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          youtube: ex.youtube,
          description: ex.description,
          target_muscles: ex.target_muscles,
          equipment: ex.equipment,
          difficulty: ex.difficulty,
          order: ex.order,
        })),
    });
  } catch (err) {
    console.error("Join jam error:", err);
    res.status(500).json({ error: err.message });
  }
};

