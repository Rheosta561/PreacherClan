const cron = require('node-cron');
const User = require('../Models/User'); 
const Notification = require('../Models/Notification');
const { onlineUsers, getIo } = require('../socket');
const { sendEmail } = require('../Utils/emailService');

const sendScheduledEmail = async (message) => {
  try {
    await sendEmail(message);
  } catch (error) {
    console.error(`Scheduled email delivery failed to ${message.to}:`, error.message);
  }
};

async function setupResetJobs() {
  // Monthly reset: 00:00 on 1st day of every month
  console.log('Setting up reset jobs...');
  cron.schedule('0 0 1 * *', async () => {
    console.log('Running monthly streak reset job...');
    try {
      const resetAt = new Date();
      const currentMonthStart = new Date(resetAt.getFullYear(), resetAt.getMonth(), 1);
      const scoredMonth = resetAt.getMonth() === 0 ? 12 : resetAt.getMonth();
      const scoredYear = resetAt.getMonth() === 0 ? resetAt.getFullYear() - 1 : resetAt.getFullYear();
      const scoredMonthName = new Date(scoredYear, scoredMonth - 1, 1).toLocaleString('default', { month: 'long' });
      const users = await User.find({
        $or: [
          { lastMonthlyReset: { $exists: false } },
          { lastMonthlyReset: null },
          { lastMonthlyReset: { $lt: currentMonthStart } },
        ],
      });

      for (const user of users) {
        const previousStreak = user.streak?.count || 0;
        user.monthlyHistory.push({
          month: scoredMonthName,
          monthNumber: scoredMonth,
          year: scoredYear,
          streak: previousStreak,
          preacherScore: user.preacherScore || 0,
        });

        user.streak = { count: 0, todayUpdated: false };
        user.preacherScore = 0;
        user.lastMonthlyReset = resetAt;

        await user.save();
        await sendScheduledEmail({
          to: user.email,
          subject: 'Monthly Score and Streak Reset',
          html: `<p>Dear ${user.name},</p>
           <p>Your monthly streak and preacher score have been reset. Your previous streak of ${previousStreak} and preacher score have been recorded for ${scoredMonthName} ${scoredYear}.</p>
           <p>Keep up the good work!</p>
           <p>Best regards,</p>
           <p>Team Preacher Clan</p>`,
        });
      }

      console.log(`Monthly reset completed for ${users.length} users.`);
    } catch (error) {
      console.error('Error during monthly reset:', error);
    }
  });

  // Weekly reset: 00:00 every Monday
  cron.schedule('0 0 * * 1', async () => {
    console.log('Running weekly workout summary and reset job...');
    try {
      const users = await User.find().select('_id name email workoutHitsPerWeek');
      const result = await sendWeeklyWorkoutUpdates(users);
      console.log(`Weekly workout updates processed for ${result.users} users; ${result.notificationFailures} notification deliveries and ${result.emailFailures} email deliveries failed.`);
      if (process.env.EMAIL) {
        await sendScheduledEmail({
          to: process.env.EMAIL,
          subject: 'Weekly Workout Hits Reset',
          html: `<p>Dear Team,</p>
         <p>The weekly workout hits have been reset for all users.</p>
         <p>Keep encouraging our community to stay active!</p>
         <p>Best regards,</p>
         <p>Team Preacher Clan</p>`,
        });
      }
    } catch (error) {
      console.error('Error during weekly reset:', error);
    }
  }, { timezone: process.env.CRON_TIMEZONE || 'Asia/Kolkata' });

  console.log('Reset jobs scheduled.');
}

const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

async function sendWeeklyWorkoutUpdates(users, dependencies = {}) {
  const NotificationModel = dependencies.NotificationModel || Notification;
  const sendEmailImpl = dependencies.sendEmail || sendEmail;
  const onlineUsersMap = dependencies.onlineUsers || onlineUsers;
  const io = Object.prototype.hasOwnProperty.call(dependencies, 'io') ? dependencies.io : getIo();
  let emailFailures = 0;
  let notificationFailures = 0;
  let processed = 0;

  for (const user of users) {
    const weeklyHits = Number(user.workoutHitsPerWeek) || 0;
    const message = `Your weekly training summary: ${weeklyHits} workout check-in${weeklyHits === 1 ? '' : 's'} logged. Your weekly count has now reset.`;
    user.workoutHitsPerWeek = 0;
    try {
      await user.save();
    } catch (error) {
      console.error(`Weekly workout count reset failed for ${user.email || user._id}:`, error.message);
    }

    try {
      const notification = await NotificationModel.create({
        userId: user._id,
        message,
        type: 'info',
      });
      const socketId = onlineUsersMap.get(user._id.toString());
      if (socketId && io) io.to(socketId).emit('notification', notification);
    } catch (error) {
      notificationFailures += 1;
      console.error(`Weekly notification failed for ${user.email || user._id}:`, error.message);
    }
    processed += 1;

    if (!user.email) continue;
    try {
      await sendEmailImpl({
        to: user.email,
        subject: 'Your Preacher Clan weekly training summary',
        html: `<p>Hi ${escapeHtml(user.name || 'there')},</p><p>You logged <strong>${weeklyHits}</strong> workout check-in${weeklyHits === 1 ? '' : 's'} this week.</p><p>Your weekly workout count has reset for the new week. Keep building your streak.</p><p>Team Preacher Clan</p>`,
      });
    } catch (error) {
      emailFailures += 1;
      console.error(`Weekly summary email failed for ${user.email}:`, error.message);
    }
  }

  return { users: processed, emailFailures, notificationFailures };
}

module.exports = { setupResetJobs, sendWeeklyWorkoutUpdates };
