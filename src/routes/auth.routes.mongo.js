const express = require("express");
const passport = require("passport");
const authController = require("../controllers-mongo/auth.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { upload } = require("../config/cloudinary");

const router = express.Router();

router.post("/signup", upload.single("profilePicture"), authController.signup);
router.post(
  "/login",
  passport.authenticate("local", { session: false }),
  authController.login
);

router.get("/google", (req, res, next) => {
  const { from } = req.query;
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    state: from || "login",
  })(req, res, next);
});

router.get(
  "/google/callback",
  (req, res, next) => {
    const state = req.query.state || "login";
    const failureRedirect = `${process.env.FRONTEND_URL || "http://localhost:5173"}/${state === "signup" ? "signup" : "login"}?error=google_auth_failed`;
    passport.authenticate("google", { failureRedirect, session: false })(req, res, next);
  },
  authController.googleCallback
);

router.get("/me", authMiddleware, authController.getMe);
router.get("/profile/:userId", authMiddleware, authController.getProfile);
router.put("/profile", authMiddleware, upload.single("profilePicture"), authController.updateProfile);

module.exports = router;
