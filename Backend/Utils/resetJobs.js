const cron = require('node-cron');
const User = require('../Models/User'); 
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS
  }
});
const {sendEmail} = require('../Utils/emailService');

function setupResetJobs() {
  // Monthly reset: 00:00 on 1st day of every month
  console.log('Setting up reset jobs...');
  cron.schedule('0 0 1 * *', async () => {
    console.log('Running monthly streak reset job...');
    try {
      const users = await User.find();
      const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

      for (const user of users) {
        user.monthlyHistory.push({
          month: currentMonth,
          streak: user.streak,
          preacherScore: user.preacherScore,
        });

        user.streak = 0;
        user.preacherScore = 0;
        user.lastMonthlyReset = new Date();

        await user.save();
        sendEmail(user.email, 
          'Monthly Streak Reset', 
          `<p>Dear ${user.name},</p>
           <p>Your monthly streak has been reset. Your previous streak of ${user.streak} has been recorded for the month of ${currentMonth}.</p>
           <p>Keep up the good work!</p>
           <p>Best regards,</p>
           <p>Team Preacher Clan</p>`
        );
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
      sendEmail(process.env.EMAIL, 
        'Weekly Workout Hits Reset', 
        `<p>Dear Team,</p>
         <p>The weekly workout hits have been reset for all users.</p>
         <p>Keep encouraging our community to stay active!</p>
         <p>Best regards,</p>
         <p>Team Preacher Clan</p>`
      );
    } catch (error) {
      console.error('Error during weekly reset:', error);
    }
  });

  console.log('Reset jobs scheduled.');
}

module.exports = { setupResetJobs };
