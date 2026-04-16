const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.put("/profile", authMiddleware, authController.updateProfile);
router.get("/profile/:id", authMiddleware, authController.getProfile);
router.get("/me", authMiddleware, authController.getProfile);

module.exports = router;