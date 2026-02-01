const mongoose = require("mongoose");
const User = require("../Models/User");
const Gym = require("../Models/GymSchema");

const toObjectId = (val) => {
  if (!val) return null;

  // Already ObjectId
  if (val instanceof mongoose.Types.ObjectId) {
    return val;
  }

  // Populated document
  if (val._id && val._id instanceof mongoose.Types.ObjectId) {
    return val._id;
  }

  // { id: ObjectId }
  if (val.id && val.id instanceof mongoose.Types.ObjectId) {
    return val.id;
  }

  // Buffer
  if (Buffer.isBuffer(val)) {
    try {
      return new mongoose.Types.ObjectId(val);
    } catch {
      return null;
    }
  }

  // String ObjectId
  if (typeof val === "string" && mongoose.Types.ObjectId.isValid(val)) {
    return new mongoose.Types.ObjectId(val);
  }

  return null;
};

const fixUserGymData = async (req, res) => {
  try {
    const users = await User.find({});
    let fixed = 0;
    let skipped = 0;

    for (const u of users) {
      let updated = false;

      // Try to extract a gym ObjectId safely
      let gymId = toObjectId(u.gym);

      // If gym is string name
      if (!gymId && typeof u.gym === "string") {
        const gymByName = await Gym.findOne({ name: u.gym }).lean();
        if (gymByName) {
          gymId = gymByName._id;
        }
      }

      // If we found a valid gym
      if (gymId && mongoose.Types.ObjectId.isValid(gymId)) {
        const gym = await Gym.findById(gymId).lean();

        if (gym) {
          u.gym = {
            id: gym._id,
            name: gym.name,
          };
          updated = true;
        } else {
          u.gym = undefined;
          updated = true;
        }
      }

      //  Invalid gym remove
      if (!gymId && u.gym) {
        u.gym = undefined;
        updated = true;
      }

      if (updated) {
        await u.save();
        fixed++;
      } else {
        skipped++;
      }
    }

    return res.status(200).json({
      message: "User gym data fixed successfully",
      fixed,
      skipped,
      total: users.length,
    });

  } catch (err) {
    console.error("fixUserGymData error:", err);
    return res.status(500).json({
      message: "Fix failed",
      error: err.message,
    });
  }
};



const clearUserGym = async (req, res) => {
  try {
    const result = await User.updateMany(
      {},
      {
        $unset: { gym: "" }
      }
    );

    return res.status(200).json({
      message: "Gym removed from all users successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("clearUserGym error:", error);
    return res.status(500).json({
      message: "Failed to clear user gyms",
      error: error.message,
    });
  }
};
const resetAllGymAndUserData = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Clear gym field from all users
    const userResult = await User.updateMany(
      {},
      {
        $unset: { gym: "" },
      },
      { session }
    );

    // 2️⃣ Clear members & trainers from all gyms
    const gymResult = await Gym.updateMany(
      {},
      {
        $set: {
          members: [],
          trainers: [],
        },
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "All gym and user data reset successfully",
      usersUpdated: userResult.modifiedCount,
      gymsUpdated: gymResult.modifiedCount,
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("resetAllGymAndUserData error:", error);
    return res.status(500).json({
      success: false,
      message: "Reset failed",
      error: error.message,
    });
  }
};




module.exports = { fixUserGymData , clearUserGym , resetAllGymAndUserData };
