const User = require("../Models/User");
const NotificationService = require("../Utils/NotificationService");
const sendExpoPush = require("./sendExpoPush");
const { getDateKey } = require("../Services/entryLogsService");

const updateStreak = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const currentDateKey = getDateKey(new Date());
    const lastUpdatedKey = user.streak?.lastUpdatedAt ? getDateKey(user.streak.lastUpdatedAt) : null;
    const alreadyUpdatedToday = user.streak?.todayUpdated && lastUpdatedKey === currentDateKey;

    if (alreadyUpdatedToday) {
      return {
        streakCount: user.streak.count || 0,
        updatedToday: false,
        workoutHitsPerWeek: user.workoutHitsPerWeek || 0,
      };
    }

    const currStreak = user.streak.count || 0;
    const weeklyHits = user.workoutHitsPerWeek || 0;

    user.workoutHitsPerWeek = weeklyHits + 1;
    user.streak.count = currStreak + 1;
    user.streak.todayUpdated = true;
    user.streak.lastUpdatedAt = new Date();

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

    return {
      streakCount: user.streak.count,
      updatedToday: true,
      workoutHitsPerWeek: user.workoutHitsPerWeek,
    };
  } catch (error) {
    console.error("Error updating streak:", error);
    throw error;
  }
};

module.exports = { updateStreak };
