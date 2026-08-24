const passport = require("passport");
const { Strategy: LocalStrategy } = require("passport-local");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require("bcrypt");
const { getUserModel } = require("../models/User");
const userStore = require("../utils/userStore");

async function findUserByEmail(email) {
  const User = getUserModel();
  if (User) {
    return User.findOne({ email: email.toLowerCase().trim() });
  }
  return userStore.findByEmail(email);
}

async function createUserRecord(payload) {
  const User = getUserModel();
  if (User) {
    return User.create(payload);
  }
  return userStore.createUser(payload);
}

async function findUserById(id) {
  const User = getUserModel();
  if (User) {
    return User.findById(id);
  }
  return userStore.findById(id);
}

async function findUserByPublicId(publicId) {
  const User = getUserModel();
  if (User) {
    return User.findOne({ publicId });
  }
  return userStore.findByPublicId(publicId);
}

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      session: false,
    },
    async (email, password, done) => {
      try {
        const user = await findUserByEmail(email);
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
        let user = await findUserByEmail(email || "");
        if (!user && profile.id) {
          user = await findUserById(profile.id);
        }

        if (!user) {
          user = await createUserRecord({
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
            if (getUserModel()) {
              await user.save();
            } else {
              await userStore.updateUser(user.publicId, {
                googleId: user.googleId,
                profilePictureUrl: user.profilePictureUrl,
                profilePic: user.profilePic,
              });
            }
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
    const user = await findUserById(id);
    done(null, user || false);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;
