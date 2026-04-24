const express = require("express");
const rideController = require("../controllers-mongo/ride.controller");
const { authMiddleware, optionalAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", optionalAuth, rideController.listRides);
router.get("/:rideId", optionalAuth, rideController.getRide);
router.post("/", authMiddleware, rideController.createRide);
router.patch("/:rideId", authMiddleware, rideController.updateRide);
router.patch("/:rideId/status", authMiddleware, rideController.updateRideStatus);
router.delete("/:rideId", authMiddleware, rideController.deleteRide);

module.exports = router;
