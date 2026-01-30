const WorkoutSplit = require("../Models/WorkoutSplit");
const jwt = require("jsonwebtoken");
const { generateSplitId } = require("../Utils/generateSplitId");

const JWT_SECRET = process.env.SPLIT_SHARE_SECRET || "split_secret";
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

    if (split.creatorId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // whitelist updates
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

    const split = await WorkoutSplit.findOne({ split_id: splitId });
    if (!split) return res.status(404).json({ error: "Split not found" });

    res.json(split);
  } catch (err) {
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

    // text search (split name OR creator)
    if (q && q.trim()) {
      filter.$or = [
        { split_name: { $regex: q, $options: "i" } },
        { creator: { $regex: q, $options: "i" } },
      ];
    }

    // optional flags
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
