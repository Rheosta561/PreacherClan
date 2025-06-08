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
const {initSocket} = require('./socket');
initSocket(server);
const NotificationRouter = require('./Routes/NotificationRouter');

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
const authRoutes = require('./Routes/AuthRoutes');
const JoinGymRoutes = require('./Routes/joinGymRouter');
const passport = require("passport");
const resetJobs = require("./Utils/resetJobs");
require("./config/passport");
app.use(passport.initialize());
app.use(useragent.express());
app.use(cors());
resetJobs.setupResetJobs();

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
app.use('/profile', ProfileRoutes);
app.use('/gym', GymRoutes);
app.use('/join', JoinGymRoutes);
app.use('/requests' , requestHandlerRouter);
app.use('/user', userRouter);
app.use('/notifications', NotificationRouter);
app.use('/repmate' , repmateRouter); 


const port = process.env.PORT || 3000 ;
server.listen(port, ()=> {
    console.log('server + socket.io is up and running on ' + port);
});
