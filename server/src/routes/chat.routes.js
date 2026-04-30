const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chat.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

router.get("/history/:bookingId", authMiddleware, chatController.getChatHistory);

module.exports = router;
