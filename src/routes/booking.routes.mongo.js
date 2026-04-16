const express = require("express");
const bookingController = require("../controllers-mongo/booking.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/my", bookingController.listMyBookings);
router.post("/", bookingController.createBooking);
router.patch("/:bookingId/cancel", bookingController.cancelBooking);

module.exports = router;
