const express = require("express")
const router = express.Router()
const reviewController = require("../controllers/review.controller")
const authMiddleware = require("../middleware/auth.middleware")

router.post("/", authMiddleware, reviewController.createReview)
router.get("/user/:userId", reviewController.getReviewsForUser)
router.get("/ride/:rideId", reviewController.getReviewsForRide)

module.exports = router
