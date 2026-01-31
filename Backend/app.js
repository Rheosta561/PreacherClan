const express = require('express');
const app = express();
const conn = require('./Connection/Connection');
const ProfileRoutes = require('./Routes/ProfileRoutes');
const useragent = require("express-useragent");
const cors = require('cors');
const GymRoutes = require('./Routes/GymRoutes');
const requestHandlerRouter = require('./Routes/RequestHandlerRouter');
const userRouter = require('./Routes/UserRouter');
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const requests = require('./Models/Requests');
const repmateRouter = require('./Routes/RepmateRouter');
const challengeRouter = require('./Routes/ChallengeRoutes');
const jamRouter = require('./Routes/WorkoutJamRoutes');
const User = require('./Models/User');
const sendExpoPush = require('./Utils/sendExpoPush');
const splitRouter = require('./Routes/WorkoutSplitRouter');
const adminRouter = require('./Routes/AdminRoutes');


const cookieParser = require('cookie-parser');
const {initSocket} = require('./socket');
initSocket(server);
// const client = require('./Connection/RedisConnection');

const NotificationRouter = require('./Routes/NotificationRouter');
const chatRouter = require('./Routes/ChatRoutes');
const messageRouter = require('./Routes/MessageRoutes');


const searchRouter = require('./Routes/searchRoutes');

// middleware


// const deleteRequests = async(req,res)=>{
//     try {
//         const deletedRequests = await requests.deleteMany();
//        console.log(`Deleted ${deletedRequests.deletedCount} rejected requests`);
//     } catch (error) {
//         console.error("Error deleting rejected requests:", error);
//     }
// }
// deleteRequests();


conn();
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
const authRoutes = require('./Routes/AuthRoutes');
const JoinGymRoutes = require('./Routes/joinGymRouter');
const passport = require("passport");
const resetJobs = require("./Utils/resetJobs");
const {userImage} = require('./Manipulations/UserImage');
require("./config/passport");
app.use(passport.initialize());
app.use(useragent.express());
app.use(cors());
resetJobs.setupResetJobs();

const authMiddleware = require('./Middleware/auth');


const resetStreak = require('./Utils/resetStreak');
const cron = require('node-cron');
cron.schedule('0 0 * * *', () => {
    console.log('Running streak reset job at midnight');
    resetStreak();
}, {
    timezone: "Asia/Kolkata"
});



app.get('/' , (req,res)=>{
    res.send('Preacher Clan Backend is working');
});
app.use('/auth', authRoutes );
app.use('/profile', authMiddleware , ProfileRoutes);
app.use('/gym', authMiddleware ,  GymRoutes);
app.use('/join', authMiddleware , JoinGymRoutes);
app.use('/requests' , authMiddleware , requestHandlerRouter);
app.use('/user', authMiddleware , userRouter);
app.use('/notifications', authMiddleware , NotificationRouter);
app.use('/repmate' , authMiddleware , repmateRouter); 

app.use('/chat', authMiddleware , chatRouter);
app.use('/message' , authMiddleware , messageRouter );

app.use('/search', authMiddleware , searchRouter);


// challenge routes
app.use('/challenge', authMiddleware ,  challengeRouter);


// jam routes
app.use('/jam', authMiddleware , jamRouter);

// split routes 
app.use('/split' , authMiddleware , splitRouter);

// admin routes 
app.use('/admin', adminRouter);



//  testing notifications 
app.post("/test/:buddyId",  async (req, res) => {
  try {
    const buddyId  = req.params.buddyId ; 

    if (!buddyId) {
      return res.status(400).json({ message: "buddyId is required" })
    }

    const buddy = await User.findById(buddyId)

    if (!buddy?.pushToken) {
      return res.json({
        skipped: true,
        reason: "No push token found for user",
      })
    }

    await sendExpoPush({
      to: buddy.pushToken,
      title: "Ek Rep Aur 💪",
      body: "Test notification from Postman",
      data: {
        type: "WORKOUT_UPDATE",
      },
    })

    res.json({ sent: true })
  } catch (err) {
    console.error("❌ Push error:", err)
    res.status(500).json({ message: "Push test failed" })
  }
})















const port = process.env.PORT || 3000 ;
server.listen(port, ()=> {
    console.log('server + socket.io is up and running on ' + port);
});
