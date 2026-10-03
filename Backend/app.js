require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });

const express = require('express');
const { mcpAuthRouter } = require("@modelcontextprotocol/sdk/server/auth/router.js");
const app = express();
const env = require("./config/env");
const mcpOAuthConfig = require("./config/mcpOAuth");
const mcpOAuthProvider = require("./Services/mcpOAuthProviderInstance");
const mcpOAuthRoutes = require("./Routes/mcpOAuthRoutes");
const { shouldEnforceMcpOrigin } = require("./Utils/mcpOriginPolicy");
const { scopes: mcpScopes } = mcpOAuthConfig;
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
const TrainingRoutes = require("./Routes/TrainingRoutes");
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
const McpRoutes = require('./Routes/mcpRoutes');



conn();
const trustProxySetting = process.env.TRUST_PROXY?.trim();
const trustProxy =
    trustProxySetting === "true"
        ? true
        : trustProxySetting === undefined ||
            trustProxySetting === "" ||
            trustProxySetting === "false"
          ? false
          : /^\d+$/.test(trustProxySetting)
            ? Number(trustProxySetting)
            : trustProxySetting
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean);
app.set("trust proxy", trustProxy);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));
app.use(express.urlencoded({
    extended: true,
    limit: process.env.JSON_BODY_LIMIT || "1mb",
}));
const authRoutes = require('./Routes/AuthRoutes');
const JoinGymRoutes = require('./Routes/joinGymRouter');
const passport = require("passport");
const resetJobs = require("./Utils/resetJobs");
require("./config/passport");
app.use(passport.initialize());
app.use(useragent.express());
app.use((req, res, next) => {
    const isMcpRoute =
        req.path === "/mcp" ||
        req.path.startsWith("/mcp/") ||
        ["/authorize", "/token", "/register", "/revoke"].includes(req.path) ||
        req.path.startsWith("/.well-known/");
    if (isMcpRoute && env.isProduction && !req.secure) {
        return res.status(426).json({
            error: "HTTPS is required for MCP OAuth and MCP requests",
        });
    }
    const origin = req.get("origin");
    if (
        shouldEnforceMcpOrigin(req.path) &&
        origin &&
        !env.isOriginAllowed(origin)
    ) {
        return res.status(403).json({ error: "Origin is not allowed" });
    }
    return next();
});
app.use(cors(env.cors));
resetJobs.setupResetJobs();

app.use(
    "/",
    mcpAuthRouter({
        provider: mcpOAuthProvider,
        issuerUrl: mcpOAuthConfig.issuerUrl,
        resourceServerUrl: mcpOAuthConfig.resourceUrl,
        scopesSupported: mcpScopes,
        resourceName: "Preacher Clan MCP",
    })
);
app.use("/mcp/oauth", mcpOAuthRoutes);


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
app.use('/training', TrainingRoutes);
app.use('/review', ReviewRoutes);
app.use('/grievances', GrievanceRoutes);
app.use('/leaderboard', LeaderboardRoutes);
app.use('/mcp', McpRoutes());

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
