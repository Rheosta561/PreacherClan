const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../Models/User");
require("dotenv").config();

async function generateUniqueUsername(name) {
    let baseUsername = name.replace(/\s+/g, "").toLowerCase();
    let uniqueUsername;
    let isUnique = false;

    while (!isUnique) {
        let randomNum = Math.floor(100000 + Math.random() * 900000);
        uniqueUsername = `${baseUsername}${randomNum}`;

        const existingUser = await User.findOne({ username: uniqueUsername });
        if (!existingUser) {
            isUnique = true;
        }
    }

    return uniqueUsername;
}

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
            try {

                let user = await User.findOne({ email: profile.emails[0].value });
                const uniqueUsername = await generateUniqueUsername(profile.displayName || "user");

                if (!user) {
                    user = new User({
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        profilePic: profile.photos[0].value,
                        username: uniqueUsername
                    });

                    await user.save();
                }

                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});
