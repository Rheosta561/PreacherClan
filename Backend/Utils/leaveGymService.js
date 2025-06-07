const User = require("../Models/User");
const Gym = require("../Models/GymSchema");
const emailService = require("./emailService"); // Assuming you have an email service to send emails

const leaveGym = async(userId, gymId)=>{
    try {
        // Find the user and gym
        const user = await User.findById(userId);
        const gym = await Gym.findById(gymId);
        if (!user || !gym) {
            throw new Error("User or Gym not found");
        }
        // Check if the user is a member of the gym
        if (!user.gym === gymId) {
            throw new Error("User is not a member of this gym");
        }
        // Remove the user from the gym
        user.gym = null;
        await user.save();
        gym.members = gym.members.filter(member => member.toString() !== userId);
        await gym.save();
        // Send confirmation email
        const htmlContent= `<!DOCTYPE html>
<html>
    <head>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 0;
                background: #f4f4f4;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                padding: 20px;
                border: 1px solid #ccc;
                border-radius: 10px;
                background: #f9f9f9;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                padding: 10px;
                background: #000000;
                color: white;
                border-radius: 10px 10px 0 0;
                overflow: hidden;
            }
            .content {
                padding: 20px;
                color: #333;
            }
            .footer {
                text-align: center;
                padding: 10px;
                font-size: 0.9rem;
                color: #888;
                border-top: 1px solid #ccc;
                margin-top: 20px;
            }
            .logo {
                height: 50%;
                width: 50%;
                transform: scale(1.2);
                border-radius: 0.5rem;
            }

            /* Media Query for Smaller Screens */
            @media screen and (max-width: 768px) {
                .container {
                    margin: 10px;
                    padding: 15px;
                }
                .content {
                    padding: 15px;
                }
                .logo {
                    width: 60%;
                    transform: scale(1);
                    height: 50%;
                }
            }

            @media screen and (max-width: 480px) {
                .container {
                    margin: 10px;
                    padding: 10px;
                }
                .content {
                    padding: 10px;
                }
                .logo {
                    width: 70%;
                    height: 50%;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://i.pinimg.com/736x/18/77/2d/18772d8fe4fe3dafe5a34fdbdff8b9d7.jpg" class="logo" alt="Preacher Clan Logo">
            </div>
            <div class="content">
                <p><b>Hi ${user.username},</b></p>
                <p>We noticed that you've recently left <b>${gym.name}</b>. We're sorry to see you go!</p>
                <p>Thank you for being a part of our fitness community. Remember, the journey doesn’t end here — whether it’s at another gym or through your own home workouts, keep pushing for those gains.</p>
                <p>At <b>Preacher Clan</b>, we’re always here to support you on your fitness journey, no matter where it takes you.</p>
                
                <hr>
                <p>Stay strong and keep the fire alive for <strong>"Ek Rep Aur"</strong>!</p>
                <p>Wishing you all the best,</p>
                <p><b>Team Preacher Clan</b></p>
            </div>
        </div>
    </body>
</html>
`

        
    } catch (error) {
        throw new Error(`Error leaving gym: ${error.message}`);
    }
}
module.exports = { leaveGym };