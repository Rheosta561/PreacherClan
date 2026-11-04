const Notification = require('../Models/Notification');
const { onlineUsers, getIo } = require('../socket');
const sendExpoPush = require('./sendExpoPush');

const sendNotification = async (
  user,
  message,
  title,
  severity = 'info',
  pushType,
  pushData = {},
) => {
  const notification = await Notification.create({
    userId: user._id,
    message,
    type: severity,
  });

  const socketId = onlineUsers.get(user._id.toString());
  if (socketId) {
    try {
      getIo()?.to(socketId).emit('notification', notification);
    } catch (error) {
      console.error('Socket notification delivery failed:', error.message);
    }
  }

  try {
    await sendExpoPush({
      to: user.pushToken,
      title,
      body: message,
      data: { type: pushType, ...pushData },
    });
  } catch (error) {
    // Push delivery is best-effort and must not fail the action that created the notification.
    console.error('Push notification delivery failed:', error.message);
  }

  return notification;
};

module.exports = { sendNotification };
