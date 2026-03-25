const sendExpoPush = require("../Utils/sendExpoPush");

const sendPushNotification = async ({ user, title, body, data = {} }) => {
  if (!user?.pushToken) {
    return {
      attempted: false,
      sent: false,
      reason: "Missing push token",
    };
  }

  try {
    const response = await sendExpoPush({
      to: user.pushToken,
      title,
      body,
      data,
    });

    return {
      attempted: true,
      sent: true,
      response,
    };
  } catch (error) {
    return {
      attempted: true,
      sent: false,
      reason: error.message || "Push send failed",
    };
  }
};

module.exports = {
  // TODO: Replace this wrapper with a provider-backed bulk push service if delivery volume grows.
  sendPushNotification,
};
