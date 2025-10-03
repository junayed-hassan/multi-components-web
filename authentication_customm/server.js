const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const LinkedInStrategy = require("passport-linkedin-oauth2").Strategy;
const AppleStrategy = require("passport-apple");
const TwitterStrategy = require("passport-twitter").Strategy;
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(session({ secret: "your_secret_key", resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// ✅ GOOGLE
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/auth/google/callback",
}, (accessToken, refreshToken, profile, done) => done(null, profile)));

// ✅ GITHUB
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/auth/github/callback",
}, (accessToken, refreshToken, profile, done) => done(null, profile)));

// ✅ FACEBOOK
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/auth/facebook/callback",
    profileFields: ["id", "displayName", "photos", "email"],
}, (accessToken, refreshToken, profile, done) => done(null, profile)));

// ✅ LINKEDIN
passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/auth/linkedin/callback",
    scope: ["r_emailaddress", "r_liteprofile"],
}, (accessToken, refreshToken, profile, done) => done(null, profile)));

// ✅ APPLE
passport.use(new AppleStrategy({
    clientID: process.env.APPLE_CLIENT_ID,
    teamID: process.env.APPLE_TEAM_ID,
    keyID: process.env.APPLE_KEY_ID,
    privateKey: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    callbackURL: "http://localhost:5000/auth/apple/callback",
}, (accessToken, refreshToken, idToken, profile, done) => done(null, profile)));

// ✅ TWITTER (X)
passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: "http://localhost:5000/auth/twitter/callback",
    includeEmail: true,
}, (token, tokenSecret, profile, done) => done(null, profile)));

// 🔥 COMMON REDIRECT FUNCTION
const redirectWithJWT = (req, res) => {
    const token = jwt.sign({ user: req.user }, "jwt_secret", { expiresIn: "1h" });
    res.redirect(`http://localhost:5173/dashboard?token=${token}`);
};

// ROUTES
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
app.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/login" }), redirectWithJWT);

app.get("/auth/github", passport.authenticate("github", { scope: ["user:email"] }));
app.get("/auth/github/callback", passport.authenticate("github", { failureRedirect: "/login" }), redirectWithJWT);

app.get("/auth/facebook", passport.authenticate("facebook", { scope: ["email"] }));
app.get("/auth/facebook/callback", passport.authenticate("facebook", { failureRedirect: "/login" }), redirectWithJWT);

app.get("/auth/linkedin", passport.authenticate("linkedin"));
app.get("/auth/linkedin/callback", passport.authenticate("linkedin", { failureRedirect: "/login" }), redirectWithJWT);

app.get("/auth/apple", passport.authenticate("apple"));
app.get("/auth/apple/callback", passport.authenticate("apple", { failureRedirect: "/login" }), redirectWithJWT);

app.get("/auth/twitter", passport.authenticate("twitter"));
app.get("/auth/twitter/callback", passport.authenticate("twitter", { failureRedirect: "/login" }), redirectWithJWT);

app.listen(5000, () => console.log("✅ Server running on http://localhost:5000"));
