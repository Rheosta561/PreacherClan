const WorkoutSplit = require("../Models/WorkoutSplit");
const jwt = require("jsonwebtoken");
const { generateSplitId } = require("../Utils/generateSplitId");

const JWT_SECRET = process.env.SPLIT_SHARE_SECRET || "split_secret";

const PRESET_SPLITS = [
  {
    split_id: "odin_strength_5day",
    split_name: "Odin’s Power Forge",
    creator: "Ragnar Lothbrok",
    creatorId: "67e9c035c1bd2f22459eb5ee",
    description: "A 5-day strength-focused warrior split forged in the halls of Valhalla. Built for raw power and progressive overload.",
    trending: true,
    trusted: true,
    cover_image: "https://images.unsplash.com/photo-1579758629938-03607ccdbaba",
    exercises: [
      { day: "Mo", name: "Barbell Bench Press", sets: 5, reps: 5, difficulty: "Intermediate", target_muscles: ["Chest", "Triceps", "Front Delts"], equipment: "Barbell", youtube: "https://youtu.be/gRVjAtPip0Y", description: "A foundational Viking pressing movement to build relentless chest strength." },
      { day: "Mo", name: "Incline Dumbbell Press", sets: 4, reps: 8, difficulty: "Intermediate", equipment: "Dumbbells", target_muscles: ["Upper Chest", "Shoulders"], youtube: "https://youtu.be/8iPEnn-ltC8" },
      { day: "Tu", name: "Back Squat", sets: 5, reps: 5, difficulty: "Intermediate", target_muscles: ["Quads", "Glutes", "Core"], equipment: "Barbell", youtube: "https://youtu.be/YaXPRqUwItQ" },
      { day: "Tu", name: "Romanian Deadlift", sets: 4, reps: 8, difficulty: "Intermediate", equipment: "Barbell", target_muscles: ["Hamstrings", "Glutes", "Lower Back"], youtube: "https://youtu.be/7j-2_s8fOPs" },
      { day: "We", name: "Overhead Press", sets: 5, reps: 5, difficulty: "Intermediate", equipment: "Barbell", target_muscles: ["Shoulders", "Triceps"], youtube: "https://youtu.be/2yjwXTZQDDI" },
      { day: "Fr", name: "Conventional Deadlift", sets: 5, reps: 3, difficulty: "Advanced", equipment: "Barbell", target_muscles: ["Posterior Chain", "Core", "Upper Back"], youtube: "https://youtu.be/-4qRntuXBSc" },
    ],
  },
  {
    split_id: "valkyrie_sculpt_hyper",
    split_name: "Valkyrie Sculpt Split",
    creator: "Lagertha",
    creatorId: "67e9c035c1bd2f22459eb5ee",
    trusted: true,
    description: "A hypertrophy-focused split for fearless lifters seeking sculpted strength and warrior endurance.",
    cover_image: "https://images.unsplash.com/photo-1558611848-73f7eb4001a1",
    exercises: [
      { day: "Mo", name: "Incline Dumbbell Press", sets: 4, reps: 12, difficulty: "Beginner", equipment: "Dumbbells", target_muscles: ["Chest", "Shoulders"], youtube: "https://youtu.be/8iPEnn-ltC8" },
      { day: "Tu", name: "Goblet Squat", sets: 4, reps: 15, equipment: "Dumbbell", difficulty: "Beginner", target_muscles: ["Quads", "Glutes"], youtube: "https://youtu.be/6xwGFn-J_QM" },
      { day: "Th", name: "Lat Pulldown", sets: 4, reps: 12, equipment: "Cable", difficulty: "Beginner", target_muscles: ["Lats", "Biceps"], youtube: "https://youtu.be/CAwf7n6Luuc" },
    ],
  },
  {
    split_id: "berserker_push_pull_legs",
    split_name: "Berserker Push • Pull • Legs",
    creator: "Ubbe",
    creatorId: "67e9c035c1bd2f22459eb5ee",
    trending: true,
    description: "A classic Viking Push-Pull-Legs split designed for steady growth and battle-ready conditioning.",
    cover_image: "https://images.unsplash.com/photo-1599058917212-d750089bc07e",
    exercises: [
      { day: "Mo", name: "Dumbbell Shoulder Press", sets: 4, reps: 10, target_muscles: ["Shoulders", "Triceps"], equipment: "Dumbbells", youtube: "https://youtu.be/B-aVuyhvLHU", difficulty: "Intermediate" },
      { day: "Tu", name: "Seated Cable Row", sets: 4, reps: 12, target_muscles: ["Back", "Biceps"], equipment: "Cable Machine", youtube: "https://youtu.be/GZbfZ033f74" },
      { day: "We", name: "Leg Press", sets: 4, reps: 12, target_muscles: ["Quads", "Glutes"], equipment: "Machine", youtube: "https://youtu.be/IZxyjW7MPJQ" },
    ],
  },
];

exports.createSplit = async (req, res) => {
  try {
    const {
      split_name,
      description,
      exercises,
      cover_image,
      creator ,
      creatorId ,
    } = req.body;

    const split = await WorkoutSplit.create({
      split_id: generateSplitId(),
      split_name,
      description,
      exercises,
      cover_image,
      creator,
      creatorId,
    });

    res.status(201).json(split);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create split" });
  }
};
exports.updateSplit = async (req, res) => {
  try {
    const { splitId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "UserId is required" });
    }

    const split = await WorkoutSplit.findOne({ split_id: splitId });

    if (!split) {
      return res.status(404).json({ message: "Split not found" });
    }

    if (split.creatorId && split.creatorId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const allowedFields = [
      "split_name",
      "description",
      "exercises",
      "cover_image",
      "trending",
      "trusted",
      "verified",
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        split[field] = req.body[field];
      }
    });

    await split.save();

    return res.status(200).json(split);
  } catch (err) {
    console.error("updateSplit error:", err);
    return res.status(500).json({ message: "Failed to update split" });
  }
};

exports.getSplitById = async (req, res) => {
  try {
    const { splitId } = req.params;

    let split = await WorkoutSplit.findOne({ split_id: splitId });
    
    // Auto-seed presets if they are not in DB
    if (!split) {
      const preset = PRESET_SPLITS.find(p => p.split_id === splitId);
      if (preset) {
        split = await WorkoutSplit.create(preset);
      }
    }

    if (!split) return res.status(404).json({ error: "Split not found" });

    res.json(split);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch split" });
  }
};

exports.generateShareToken = async (req, res) => {
  try {
    const { splitId } = req.params;

    const split = await WorkoutSplit.findOne({ split_id: splitId });
    if (!split) return res.status(404).json({ error: "Split not found" });

    const token = jwt.sign(
      { splitId },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      shareToken: token,
      shareUrl: `${process.env.FRONTEND_URL}/share/${token}`,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate share token" });
  }
};

exports.getSharedSplit = async (req, res) => {
  try {
    const { token } = req.params;

    const decoded = jwt.verify(token, JWT_SECRET);

    const split = await WorkoutSplit.findOne({
      split_id: decoded.splitId,
    });

    if (!split) {
      return res.status(404).json({ error: "Split not found" });
    }

    res.json(split);
  } catch (err) {
    return res.status(400).json({ error: "Invalid or expired token" });
  }
};

exports.searchSplits = async (req, res) => {
  try {
    const { q, trending, trusted, verified } = req.query;

    const filter = {};

    if (q && q.trim()) {
      filter.$or = [
        { split_name: { $regex: q, $options: "i" } },
        { creator: { $regex: q, $options: "i" } },
      ];
    }

    if (trending !== undefined) {
      filter.trending = trending === "true";
    }

    if (trusted !== undefined) {
      filter.trusted = trusted === "true";
    }

    if (verified !== undefined) {
      filter.verified = verified === "true";
    }

    const splits = await WorkoutSplit.find(filter)
      .sort({ createdAt: -1 })
      .limit(30);

    res.status(200).json(splits);
  } catch (err) {
    console.error("searchSplits error:", err);
    res.status(500).json({ error: "Failed to search splits" });
  }
};
