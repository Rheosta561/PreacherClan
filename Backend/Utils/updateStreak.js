const User = require("../Models/User");
const NotificationService = require("../Utils/NotificationService");
const sendExpoPush = require("./sendExpoPush");

const updateStreak = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    // Already updated today
    if (user.streak.todayUpdated) {
      await NotificationService.sendNotification(
        user,
        "You have already updated your streak for today. Keep up the good work! 💪",
        "Streak Already Updated",
        "info",
        "BATTLEFORGE"
      );

      return user.streak.count || 0;
    }

    const currStreak = user.streak.count || 0;
    const weeklyHits = user.workoutHitsPerWeek || 0;

    user.workoutHitsPerWeek = weeklyHits + 1;
    user.streak.count = currStreak + 1;
    user.streak.todayUpdated = true;

    await user.save();

    const message = `🔥 Streak Updated! Your current streak is now ${user.streak.count}. Keep pushing! 💪`;

    //  PUSH notification
    await sendExpoPush({
      to: user.pushToken,
      title: "Streak Updated ⚔️",
      body: message,
      data: {
        type: "BATTLEFORGE",
      },
    });

    // In-app notification
    await NotificationService.sendNotification(
      user,
      message,
      "Streak Updated ⚔️",
      "info",
      "BATTLEFORGE"
    );

    return user.streak.count;
  } catch (error) {
    console.error("Error updating streak:", error);
    throw error;
  }
};

module.exports = { updateStreak };
