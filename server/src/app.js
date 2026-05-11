const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
const { connectMongo } = require("./config/db");
const passport = require("./config/passport");

const authRoutes = require("./routes/auth.routes");
const rideRoutes = require("./routes/ride.routes");
const bookingRoutes = require("./routes/booking.routes");
const reviewRoutes = require("./routes/review.routes");
const notificationRoutes = require("./routes/notification.routes");
const adminRoutes = require("./routes/admin.routes");
const verifyRoutes = require("./routes/verify.routes");
const chatRoutes = require("./routes/chat.routes");

const app = express();

// Trust Render's reverse proxy
app.set("trust proxy", 1);

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased for testing
  message: { message: "Too many requests from this IP, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for Auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Increased for testing
  message: { message: "Too many authentication attempts, please try again after an hour" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", globalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        "https://ride-sharing-system-ten.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000"
      ].filter(Boolean);
      
      // Allow all Vercel preview deployments (urls ending with .vercel.app)
      const isVercelPreview = origin && origin.endsWith(".vercel.app");
      
      if (!origin || allowedOrigins.includes(origin) || isVercelPreview) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback_session_secret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/chat", chatRoutes);

app.use((err, _req, res, _next) => {
  if (err?.name === "UnauthorizedError") {
    return res.status(401).json({ message: "Unauthorized." });
  }

  if (err?.message === "Invalid email or password.") {
    return res.status(401).json({ message: err.message });
  }

  if (process.env.NODE_ENV !== "test") {
    console.error("Global Error Handler Caught:", err);
  }
  return res.status(500).json({ message: "Something went wrong." });
});

if (process.env.MONGO_URI) {
  connectMongo(process.env.MONGO_URI).catch((error) => {
    console.error("MongoDB connection error:", error);
  });
}

module.exports = app;
