const User = require('../Models/User');
const Gym = require('../Models/GymSchema');
const { sendEmail } = require('../Utils/emailService'); 



const joinController = async(req,res)=>{
    try {
        const {userId}= req.params;
        const {gymCode} = req.body;
        const foundGym = await Gym.findOne({gymCode}).populate('members');

        if(!foundGym){
            return res.status(404).json({message:"Gym not found"});
        }
        const user = await User.findById(userId);
        if(!user){
            return res.status(404).json({message:"User not found"});
        }
        if(user.gym){
            console.log(user.gym);
            return res.status(400).json({message:"User already joined a gym"});
        }
        user.gym = foundGym._id;
        await user.save();
        foundGym.members.push(user._id);
        if(user.isTrainer){
            foundGym.trainers.push(user._id);
        }
        await foundGym.save();
        const htmlContent = `<!DOCTYPE html>
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
            <p><b>Welcome to ${foundGym.name}</b> 🎉</p>
            <p>You've successfully joined <strong>Preacher Clan</strong>, one of India's most passionate and growing fitness communities.</p>
            <p>From today, you're not just working out — you're part of a clan that thrives on discipline, growth, and pushing limits together.</p>
            <hr>
            <p>Let’s lift stronger, run farther, and shout louder — <strong>"Ek Rep Aur!"</strong></p>
            <p>We’re excited to see the progress you’ll make, both inside and outside the gym.</p>
            <p><b>Team Preacher Clan</b></p>
        </div>
    </div>
</body>
</html>
`
        await sendEmail(
             user.email,
             `Welcome to ${foundGym.name}`,
             htmlContent
        );
        const gym = await Gym.findById(foundGym._id).populate('members');
       
        return res.status(200).json({message:"User joined gym successfully", user, gym});

        
        
    } catch (error) {
    return res.status(500).json({ error: error.message });
        
    }
}
module.exports = { joinController };

