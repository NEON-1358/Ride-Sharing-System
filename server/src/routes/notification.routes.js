const express = require("express");
const notificationController = require("../controllers/notification.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/", notificationController.listNotifications);
router.patch("/read-all", notificationController.markAllRead);

module.exports = router;
