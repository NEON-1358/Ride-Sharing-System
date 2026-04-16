const express = require("express");
const passport = require("passport");
const authController = require("../controllers-mongo/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { upload } = require("../config/cloudinary");

const router = express.Router();

router.post("/signup", upload.single("profilePicture"), authController.signup);
router.post(
  "/login",
  passport.authenticate("local", { session: false }),
  authController.login
);

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=google_auth_failed` }),
  authController.googleCallback
);

router.get("/me", authMiddleware, authController.getMe);
router.get("/profile/:userId", authMiddleware, authController.getProfile);
router.put("/profile", authMiddleware, upload.single("profilePicture"), authController.updateProfile);

module.exports = router;
