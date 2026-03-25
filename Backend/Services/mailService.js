const { sendEmail } = require("../Utils/emailService");

const sendAnnouncementEmail = async ({ to, subject, html }) => {
  if (!to) {
    return {
      attempted: false,
      sent: false,
      reason: "Missing email",
    };
  }

  try {
    await sendEmail(to, subject, html);
    return {
      attempted: true,
      sent: true,
    };
  } catch (error) {
    return {
      attempted: true,
      sent: false,
      reason: error.message || "Email send failed",
    };
  }
};

module.exports = {
  // TODO: Replace this wrapper with a queued transactional mail provider flow if needed.
  sendAnnouncementEmail,
};
