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
const {initSocket} = require('./socket');
initSocket(server);
const NotificationRouter = require('./Routes/NotificationRouter');
const ChatRoutes = require('./Routes/ChatRoutes');
const MessageRoutes = require('./Routes/MessageRoutes');
const ChallengeRoutes = require('./Routes/ChallengeRoutes');
const RepmateRouter = require('./Routes/RepmateRouter');
const WorkoutJamRoutes = require('./Routes/WorkoutJamRoutes');
const WorkoutPlanRoutes = require('./Routes/WorkoutPlanRoutes');
const WorkoutSplitRouter = require('./Routes/WorkoutSplitRouter');
const SearchRoutes = require('./Routes/searchRoutes');
const ReviewRoutes = require('./Routes/reviewRoutes');
const GrievanceRoutes = require('./Routes/grievanceRoutes');
const GymAuthRoutes = require('./Routes/gymAuthRoutes');
const GymOverviewRoutes = require('./Routes/gymOverviewRoutes');
const GymMembersRoutes = require('./Routes/gymMembersRoutes');
const GymTrainersRoutes = require('./Routes/gymTrainersRoutes');
const GymProfileRoutes = require('./Routes/gymProfileRoutes');
const GymReviewRoutes = require('./Routes/gymReviewRoutes');
const AnnouncementRoutes = require('./Routes/announcementRoutes');
const EntryLogsRoutes = require('./Routes/entryLogsRoutes');
const LeaderboardRoutes = require('./Routes/LeaderboardRoutes');



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


app.get('/' , (req,res)=>{
    res.send('Preacher Clan Backend is working');
});
app.use('/auth', authRoutes );
app.use('/gym/auth', GymAuthRoutes);
app.use('/profile', ProfileRoutes);
app.use('/gym', GymRoutes);
app.use('/gym', GymOverviewRoutes);
app.use('/gym', GymMembersRoutes);
app.use('/gym', GymTrainersRoutes);
app.use('/gym', GymProfileRoutes);
app.use('/gym', GymReviewRoutes);
app.use('/gym', AnnouncementRoutes);
app.use('/gym', EntryLogsRoutes);
app.use('/join', JoinGymRoutes);
app.use('/requests' , requestHandlerRouter);
app.use('/user', userRouter);
app.use('/notifications', NotificationRouter);
app.use('/chat', ChatRoutes);
app.use('/message', MessageRoutes);
app.use('/challenge', ChallengeRoutes);
app.use('/repmate', RepmateRouter);
app.use('/workout-jam', WorkoutJamRoutes);
app.use('/jam', WorkoutJamRoutes);
app.use('/workout-plan', WorkoutPlanRoutes);
app.use('/split', WorkoutSplitRouter);
app.use('/search', SearchRoutes);
app.use('/review', ReviewRoutes);
app.use('/grievances', GrievanceRoutes);
app.use('/leaderboard', LeaderboardRoutes);

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    const response = {
        error: error.message || 'Internal server error',
        message: error.message || 'Internal server error',
    };

    if (error.details) {
        response.details = error.details;
    }

    return res.status(statusCode).json(response);
});


const port = process.env.PORT || 3000 ;
server.listen(port, ()=> {
    console.log('server + socket.io is up and running on ' + port);
});
