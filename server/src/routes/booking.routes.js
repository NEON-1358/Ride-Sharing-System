const express = require("express");
const bookingController = require("../controllers/booking.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/my", authMiddleware, bookingController.listMyBookings);
router.post("/", authMiddleware, bookingController.createBooking);
router.patch("/:bookingId/cancel", authMiddleware, bookingController.cancelBooking);
router.patch("/:bookingId/accept", authMiddleware, bookingController.acceptBooking);
router.patch("/:bookingId/reject", authMiddleware, bookingController.rejectBooking);

module.exports = router;
