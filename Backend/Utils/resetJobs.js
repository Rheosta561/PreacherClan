const cron = require('node-cron');
const User = require('../Models/User'); 
const { sendEmail } = require('../Utils/emailService');

const sendScheduledEmail = async (message) => {
  try {
    await sendEmail(message);
  } catch (error) {
    console.error(`Scheduled email delivery failed to ${message.to}:`, error.message);
  }
};

function setupResetJobs() {
  // Monthly reset: 00:00 on 1st day of every month
  console.log('Setting up reset jobs...');
  cron.schedule('0 0 1 * *', async () => {
    console.log('Running monthly streak reset job...');
    try {
      const users = await User.find();
      const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

      for (const user of users) {
        const previousStreak = user.streak?.count || 0;
        user.monthlyHistory.push({
          month: new Date().toLocaleString('default', { month: 'long' }),
          streak: previousStreak,
          preacherScore: user.preacherScore,
        });

        user.streak = { count: 0, todayUpdated: false };
        user.preacherScore = 0;
        user.lastMonthlyReset = new Date();

        await user.save();
        await sendScheduledEmail({
          to: user.email,
          subject: 'Monthly Streak Reset',
          html: `<p>Dear ${user.name},</p>
           <p>Your monthly streak has been reset. Your previous streak of ${previousStreak} has been recorded for ${currentMonth}.</p>
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
    console.log('Running weekly workout hits reset job...');
    try {
      const result = await User.updateMany({}, { workoutHitsPerWeek: 0 });

      console.log(`Weekly workout hits reset for ${result.modifiedCount} users.`);
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
  });

  console.log('Reset jobs scheduled.');
}

module.exports = { setupResetJobs };
