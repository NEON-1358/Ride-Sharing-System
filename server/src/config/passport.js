const passport = require("passport");
const { Strategy: LocalStrategy } = require("passport-local");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require("bcrypt");
const User = require("../models/User");

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      session: false,
    },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user || !user.passwordHash) {
          return done(null, false, { message: "Invalid email or password." });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return done(null, false, { message: "Invalid email or password." });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "placeholder_google_client_id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder_google_client_secret",
      callbackURL: process.env.NODE_ENV === "production" 
        ? `${process.env.RENDER_EXTERNAL_URL || "https://ride-sharing-system-0vyd.onrender.com"}/api/auth/google/callback`
        : "/api/auth/google/callback",
      proxy: true,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase().trim();
        let user = await User.findOne({
          $or: [{ googleId: profile.id }, ...(email ? [{ email }] : [])],
        });

        if (!user) {
          user = await User.create({
            name: profile.displayName || (email ? email.split("@")[0] : "Google User"),
            email: email || `${profile.id}@google.oauth.local`,
            googleId: profile.id,
            profilePictureUrl: profile.photos?.[0]?.value || "",
            profilePic: profile.photos?.[0]?.value || "", // Set both for compatibility
          });
        } else {
          let changed = false;
          if (!user.googleId) {
            user.googleId = profile.id;
            changed = true;
          }
          
          const googlePhoto = profile.photos?.[0]?.value;
          if (googlePhoto) {
            // If profilePictureUrl is missing or is not the current Google photo
            if (!user.profilePictureUrl || user.profilePictureUrl !== googlePhoto) {
              user.profilePictureUrl = googlePhoto;
              changed = true;
            }
            // Also update legacy field
            if (!user.profilePic || user.profilePic !== googlePhoto) {
              user.profilePic = googlePhoto;
              changed = true;
            }
          }

          if (changed) {
            await user.save();
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user || false);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;
