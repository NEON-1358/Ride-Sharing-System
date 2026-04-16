const express = require("express");
const rideController = require("../controllers-mongo/ride.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", rideController.listRides);
router.get("/:rideId", rideController.getRide);
router.post("/", authMiddleware, rideController.createRide);
router.patch("/:rideId", authMiddleware, rideController.updateRide);
router.patch("/:rideId/status", authMiddleware, rideController.updateRideStatus);
router.delete("/:rideId", authMiddleware, rideController.deleteRide);

module.exports = router;
