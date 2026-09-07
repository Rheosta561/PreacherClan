require('dotenv').config();
const mongoose = require('mongoose');
const Gym = require('./Models/GymSchema');
const User = require('./Models/User');
const Profile = require('./Models/Profile');

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/preacherclan');
        console.log('Connected to DB');

        const gym = await Gym.findOne();
        if (!gym) {
            console.log('No gym found, creating one...');
            return;
        }

        const user = await User.findOne();
        if (!user) {
            console.log('No user found.');
            return;
        }

        // Add membership to user
        user.gymMembership = {
            gym: gym._id,
            plan: 'Gold',
            startDate: new Date(),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            status: 'Active'
        };
        await user.save();
        console.log('Assigned Gold membership to user:', user.name);

        // Add dummy trainer
        let trainer = await User.findOne({ username: 'dummytrainer' });
        if (!trainer) {
            let profile = new Profile({
                profileImage: 'https://via.placeholder.com/150',
                fitnessGoals: ['Bodybuilding', 'Crossfit']
            });
            await profile.save();

            trainer = new User({
                name: 'Dummy Trainer',
                username: 'dummytrainer',
                email: 'trainer@example.com',
                profile: profile._id,
                isTrainer: true
            });
            await trainer.save();
            console.log('Created dummy trainer');
        }

        if (!gym.trainers.includes(trainer._id)) {
            gym.trainers.push(trainer._id);
            await gym.save();
            console.log('Added dummy trainer to gym:', gym.name);
        } else {
            console.log('Trainer already in gym');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
