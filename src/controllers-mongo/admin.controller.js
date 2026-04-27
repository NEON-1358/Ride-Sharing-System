const Booking = require("../models/Booking");
const Ride = require("../models/Ride");
const User = require("../models/User");
const { toBooking, toRideCard, toUserProfile } = require("../utils/serializers");

exports.getOverview = async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required." });
  }

  const [users, rides, bookings] = await Promise.all([
    User.find().sort({ createdAt: -1 }),
    Ride.find().populate("creator").sort({ createdAt: -1 }),
    Booking.find()
      .populate({
        path: "ride",
        populate: { path: "creator" },
      })
      .populate("user")
      .sort({ createdAt: -1 }),
  ]);

  return res.json({
    users: users.map(toUserProfile),
    rides: rides.map((ride) => toRideCard({ ...ride.toObject(), passengers: [] }, req.user)),
    bookings: bookings.map(toBooking),
  });
};
