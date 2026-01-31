const User = require('../Models/User');
const Gym = require('../Models/GymSchema');
const { sendEmail } = require('../Utils/emailService');
const notificationService = require('../Utils/NotificationService');

const joinController = async (req, res) => {
  try {
    const { userId, gymCode } = req.params;

    const foundGym = await Gym.findOne({ gymCode });
    if (!foundGym) {
      return res.status(404).json({ message: "Gym not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.gym?.id) {
      return res
        .status(400)
        .json({ message: "User already joined a gym", user });
    }

    // Atomic updates (NO DUPLICATES)
    await Promise.all([
      User.findByIdAndUpdate(
        userId,
        {
          gym: {
            id: foundGym._id,
            name: foundGym.name,
          },
        },
        { new: true }
      ),

      Gym.findByIdAndUpdate(
        foundGym._id,
        {
          $addToSet: {
            members: user._id,
            ...(user.isTrainer ? { trainers: user._id } : {}),
          },
        }
      ),
    ]);

    // email 
    await sendEmail(
      user.email,
      `Welcome to ${foundGym.name}`,
      // htmlContent(user.username, foundGym.name)
    );


    const message = `🏋️ Welcome ${user.username}! You’ve successfully joined ${foundGym.name}. The clan awaits you ⚔️`;

    await notificationService.sendNotification(
      user,
      message,
      "Gym Joined 🏋️",
      "info",
      "gym",
      `/clan/${foundGym._id}`
    );

    return res.status(200).json({
      message: "User joined gym successfully",
    });

  } catch (error) {
    console.error("joinController error:", error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = { joinController };
