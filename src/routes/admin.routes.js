const express = require("express");
const adminController = require("../controllers-mongo/admin.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/overview", adminController.getOverview);

module.exports = router;
