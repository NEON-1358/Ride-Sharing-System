const express = require("express");
const reviewController = require("../controllers-mongo/review.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/ride/:rideId", reviewController.listRideReviews);
router.post("/", authMiddleware, reviewController.createReview);

module.exports = router;
