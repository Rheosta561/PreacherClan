const Notification = require('../Models/Notification');
const User = require('../Models/User');
const {onlineUsers , getIo} = require('../socket');
const emailService = require('../Utils/emailService');

exports.addNotification = async (req, res) => {
    try {
        const userId = req.params.userId; 
        const { message, type, sendEmail: requestEmail } = req.body;

        if (req.user?.id !== userId) {
            return res.status(403).json({ message: 'You can only create notifications for your account' });
        }
        if (typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ message: 'A notification message is required' });
        }

        // Validate user existence
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Create a new notification
        const notification = new Notification({
            userId,
            message: message.trim(),
            type: ['info', 'warning', 'error'].includes(type) ? type : 'info'
        });

        await notification.save();
        // Emit notification to the user if they are online
        let emailSent = false;
        let emailErrorMessage;
        if (requestEmail === true || type === 'email') {
            try {
                await emailService.sendEmail({
                    to: user.email,
                    subject: 'You Have a New Notification',
                    html: `<p>Hello ${escapeHtml(user.name || 'Preacher Clan member')},</p><p>${escapeHtml(message.trim())}</p><p>#EkRepAur</p>`,
                    text: `Hello ${user.name || 'Preacher Clan member'},\n\n${message.trim()}\n\n#EkRepAur`,
                });
                emailSent = true;
            } catch (emailError) {
                console.error('Notification email delivery failed:', emailError.message);
                emailErrorMessage = 'The in-app notification was saved, but its email could not be delivered.';
            }
        }
        const socketId = onlineUsers.get(userId.toString());
        if (socketId) {
            const io = getIo();
            io.to(socketId).emit('notification', notification);
        }
        // Respond with the created notification    
        res.status(201).json({ ...notification.toObject(), emailSent, ...(emailErrorMessage ? { emailError: emailErrorMessage } : {}) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

exports.sendMultipleNotifications = async (req, res) => {
  try {
    if (typeof req.body?.message !== 'string' || !req.body.message.trim()) {
      return res.status(400).json({ message: 'A notification message is required' });
    }
    const users = await User.find(); // Fetch all users
    const io = getIo();
    let emailAttempted = 0;
    let emailSent = 0;
    let emailFailed = 0;

    for (const user of users) {
        
      const notification = await Notification.create({
        userId: user._id,
        message: req.body.message.trim(),
        type: ['info', 'warning', 'error'].includes(req.body.type) ? req.body.type : 'info',
      });
      if (user.email) {
        emailAttempted += 1;
        try {
          await emailService.sendEmail({
            to: user.email,
            subject: 'You Have a New Notification',
            html: `<p>Hello ${escapeHtml(user.name || 'Preacher Clan member')},</p><p>${escapeHtml(notification.message)}</p><p>#EkRepAur</p>`,
            text: `Hello ${user.name || 'Preacher Clan member'},\n\n${notification.message}\n\n#EkRepAur`,
          });
          emailSent += 1;
        } catch (emailError) {
          emailFailed += 1;
          console.error(`Notification email delivery failed for ${user.email}:`, emailError.message);
        }
      }

      const socketId = onlineUsers.get(user._id.toString());
      if (socketId) {
        io.to(socketId).emit('notification', notification);
      }
    }

    res.status(200).json({
      message: 'Broadcast notifications processed',
      users: users.length,
      email: { attempted: emailAttempted, sent: emailSent, failed: emailFailed },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}
