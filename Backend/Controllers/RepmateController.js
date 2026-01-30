const User = require("../Models/User");

const handleRemoveFriend = async (req, res) => {
  try {
    const {userId,repmateId }=req.body;

    if (!userId||!repmateId) {
      return res.status(400).json({ message: "userId and repmateId are required" });
    }

// removing repmate from user 
    await User.findByIdAndUpdate(
      userId,
      { $pull: { partner: repmateId } },
      { new: true }
    );
    // remove user from the repmate 
    await User.findByIdAndUpdate(
      repmateId,
      { $pull:{partner: userId } }
    );

    return res.status(200).json({
      success: true,
      message: "partner removed successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { handleRemoveFriend };
