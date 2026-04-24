const express = require("express");
const router = express.Router();
const rideController = require("../controllers/ride.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

router.post("/", authMiddleware, rideController.createRide);
router.get("/", rideController.getAllRides);
router.get("/suggest-price", rideController.suggestPrice);
router.get("/:id", rideController.getRideById);
router.put("/:id", authMiddleware, rideController.updateRide);
router.delete("/:id", authMiddleware, rideController.deleteRide);

module.exports = router;