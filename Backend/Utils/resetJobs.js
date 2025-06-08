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
 // Weekly reset: 00:00 every Monday
cron.schedule('0 0 * * 1', async () => {
  console.log('Running weekly preacher score update and workout hits reset job...');
  try {
    const users = await User.find();

    for (const user of users) {
      const weeklyHits = user.workoutHitsPerWeek || 0;
      const scoreGain = weeklyHits * 10;
      user.preacherScore = (user.preacherScore || 0) + scoreGain;
      user.workoutHitsPerWeek = 0;
      await user.save();
      sendEmail(user.email, 
        'Weekly Preacher Score Update', 
        `<p>Dear ${user.name},</p>
         <p>Your weekly preacher score has been updated. You gained ${scoreGain} points this week.</p>
         <p>Your total preacher score is now ${user.preacherScore}.</p>
         <p>Keep up the great work!</p>
         <p>Best regards,</p>
         <p>Team Preacher Clan</p>`
      );
    }

    console.log(` Preacher scores updated and workout hits reset for ${users.length} users.`);

    

  } catch (error) {
    console.error('Error during weekly preacher score update:', error);
  }
});


  console.log('Reset jobs scheduled.');
}

module.exports = { setupResetJobs };
