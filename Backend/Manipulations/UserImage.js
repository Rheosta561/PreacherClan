const User = require('../Models/User');

const userImage = async () => {
  const users = await User.find().populate('profile');
  console.log(users);

  for (const user of users) {
    if (user?.profile?.profileImage) {
      user.image = user.profile.profileImage;
      console.log(user.image);
      await user.save();
    }
  }

  console.log('User images updated from profile.');
};

module.exports = {userImage};
