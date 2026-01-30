const express = require("express");
const router = express.Router();

const {
  createJam,
  joinJam,
} = require("../Controllers/workoutJamController");

const WorkoutJam = require("../Models/WorkoutJamSchema");

/* =====================================================
   CREATE A JAM (Leader)
   POST /api/jam/create
===================================================== */
router.post("/create", createJam);

/* =====================================================
   JOIN A JAM (HTTP fallback / deep link)
   POST /api/jam/join
===================================================== */
router.post("/join", joinJam);

/* =====================================================
   GET JAM BY CODE (used for deep link / reconnect)
   GET /api/jam/code/:jamCode
===================================================== */
router.get("/code/:jamCode", async (req, res) => {
  try {
    const { jamCode } = req.params;

    const jam = await WorkoutJam.findOne({ jamCode })
      .populate("leader", "name username profileImage")
      .populate("participants.user", "name username profileImage preacherScore");

    if (!jam) {
      return res.status(404).json({ message: "Jam not found" });
    }

    res.status(200).json(jam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   GET JAM BY ID (refresh / reconnect safe)
   GET /api/jam/:jamId
===================================================== */
router.get("/:jamId", async (req, res) => {
  try {
    const { jamId } = req.params;

    const jam = await WorkoutJam.findById(jamId)
      .populate("leader", "name username profileImage")
      .populate("participants.user", "name username profileImage preacherScore");

    if (!jam) {
      return res.status(404).json({ message: "Jam not found" });
    }

    // 🔥 Sort exercises by order (important)
    const exercises = [...jam.exercises].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );

    res.status(200).json({
      _id: jam._id,
      name: jam.name,
      jamCode: jam.jamCode,
      state: jam.state,

      // leaderId only (frontend already expects this)
      leader: jam.leader._id,

      participants: jam.participants.map(p => ({
        _id: p.user._id,
        name: p.user.name,
        username: p.user.username,
        profileImage: p.user.profileImage,
        preacherScore: p.user.preacherScore,
      })),

      // ✅ EXERCISES ADDED
      exercises: exercises.map(ex => ({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        description: ex.description,
        image: ex.image,
        youtube: ex.youtube,
        instructions: ex.instructions,
        target_muscles: ex.target_muscles,
        equipment: ex.equipment,
        difficulty: ex.difficulty,
        order: ex.order,
      })),
    });
  } catch (err) {
    console.error("Fetch jam error:", err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
