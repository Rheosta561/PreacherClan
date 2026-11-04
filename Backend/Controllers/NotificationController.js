const User = require("../Models/User")
const Notification = require("../Models/Notification");

const ensureOwnNotifications = (req, res) => {
  if (req.user.id !== req.params.userId) {
    res.status(403).json({ message: "Forbidden" });
    return false;
  }
  return true;
};

exports.getNotifications = async (req, res) => {
  try {
    if (!ensureOwnNotifications(req, res)) return;
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const notifications = await Notification.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.status(200).json({ notifications });
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    if (!ensureOwnNotifications(req, res)) return;
    const count = await Notification.countDocuments({ userId: req.params.userId, isRead: false });
    return res.status(200).json({ count });
  } catch (err) {
    console.error("Failed to fetch unread notification count:", err);
    return res.status(500).json({ message: "Failed to fetch unread notifications" });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    if (!ensureOwnNotifications(req, res)) return;
    const result = await Notification.updateMany(
      { userId: req.params.userId, isRead: false },
      { $set: { isRead: true } }
    );
    return res.status(200).json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error("Failed to mark notifications as read:", err);
    return res.status(500).json({ message: "Failed to mark notifications as read" });
  }
};

exports.savePushToken = async (req, res) => {
  try {
    const { token, userId } = req.body;

    if (req.user?.id !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!token || !token.startsWith("ExponentPushToken")) {
      return res.status(400).json({ message: "Invalid push token" })
    }

    await User.findByIdAndUpdate(userId, {
      pushToken: token,
    })

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: "Failed to save token" })
  }
}
