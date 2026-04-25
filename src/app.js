const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");
require("dotenv").config();
const { connectMongo } = require("./mongo");
const passport = require("./config/passport");

const authRoutes = require("./routes/auth.routes.mongo");
const rideRoutes = require("./routes/ride.routes.mongo");
const bookingRoutes = require("./routes/booking.routes.mongo");
const reviewRoutes = require("./routes/review.routes.mongo");
const notificationRoutes = require("./routes/notification.routes");
const adminRoutes = require("./routes/admin.routes");
const verifyRoutes = require("./routes/verify.routes.mongo");
const chatRoutes = require("./routes/chat.routes");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
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
app.use("/uploads", express.static(path.join(__dirname, "../data/uploads")));

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
