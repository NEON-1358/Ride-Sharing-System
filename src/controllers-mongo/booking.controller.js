const Joi = require("joi");
const Booking = require("../models/Booking");
const Ride = require("../models/Ride");
const { createNotification } = require("../utils/notifications");
const { toBooking } = require("../utils/serializers");

const bookingSchema = Joi.object({
  rideId: Joi.string().trim().required(),
  seats: Joi.number().integer().min(1).max(6).required(),
});

exports.createBooking = async (req, res) => {
  const { error, value } = bookingSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      message: error.details.map((detail) => detail.message).join(" "),
    });
  }

  const ride = await Ride.findOne({ publicId: value.rideId }).populate("creator");
  if (!ride) {
    return res.status(404).json({ message: "Ride not found." });
  }

  const creatorId = ride.creator?._id || ride.creator;
  if (String(creatorId) === String(req.user._id)) {
    return res.status(400).json({ message: "You cannot book your own ride." });
  }

  if (["Completed", "Cancelled"].includes(ride.status)) {
    return res.status(400).json({ message: "This ride is no longer bookable." });
  }

  const duplicate = await Booking.findOne({
    ride: ride._id,
    user: req.user._id,
    status: { $in: ["Pending", "Accepted"] },
  });
  if (duplicate) {
    return res.status(409).json({ message: "You already have an active booking or request for this ride." });
  }

  const updatedRide = await Ride.findOneAndUpdate(
    {
      _id: ride._id,
      availableSeats: { $gte: value.seats },
      status: { $in: ["Open", "Confirmed"] },
    },
    {
      $inc: { availableSeats: -value.seats },
    },
    { new: true }
  );

  if (!updatedRide) {
    return res.status(400).json({ message: "Not enough seats are available." });
  }

  const booking = await Booking.create({
    ride: updatedRide._id,
    user: req.user._id,
    seats: value.seats,
    status: "Pending",
  });

  const passengerId = req.user?._id;
  if (passengerId) {
    await createNotification({
      user: passengerId,
      type: "booking_created",
      message: `You requested ${value.seats} seat(s) from ${updatedRide.source} to ${updatedRide.destination}. Waiting for driver approval.`,
      metadata: {
        ridePublicId: updatedRide.publicId,
        bookingPublicId: booking.publicId,
      },
    });
  }

  if (creatorId) {
    await createNotification({
      user: creatorId,
      type: "booking_received",
      message: `${req.user?.name || "Someone"} requested ${value.seats} seat(s) on your ride from ${updatedRide.source} to ${updatedRide.destination}.`,
      metadata: {
        ridePublicId: updatedRide.publicId,
        bookingPublicId: booking.publicId,
      },
    });
  }

  const populated = await Booking.findById(booking._id)
    .populate({
      path: "ride",
      populate: { path: "creator" },
    })
    .populate("user");

  return res.status(201).json(toBooking(populated));
};

exports.listMyBookings = async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate({
      path: "ride",
      populate: { path: "creator" },
    })
    .populate("user")
    .sort({ createdAt: -1 });

  return res.json(bookings.map(toBooking));
};

exports.cancelBooking = async (req, res) => {
  const booking = await Booking.findOne({ publicId: req.params.bookingId })
    .populate({
      path: "ride",
      populate: { path: "creator" },
    })
    .populate("user");

  if (!booking) {
    return res.status(404).json({ message: "Booking not found." });
  }

  const bookingUserId = booking.user?._id || booking.user;
  const creatorId = booking.ride?.creator?._id || booking.ride?.creator;

  const isPassenger = String(bookingUserId) === String(req.user._id);
  const isCreator = String(creatorId) === String(req.user._id);

  if (!isPassenger && !isCreator) {
    return res.status(403).json({ message: "Only the booking owner or ride creator can cancel this booking." });
  }

  if (!["Pending", "Accepted"].includes(booking.status)) {
    return res.status(400).json({ message: "Only active or pending bookings can be cancelled." });
  }

  if (booking.ride && ["Completed", "Cancelled"].includes(booking.ride.status)) {
    return res.status(400).json({ message: "This booking can no longer be cancelled." });
  }

  booking.status = "Cancelled";
  booking.cancelledAt = new Date();
  await booking.save();

  if (booking.ride) {
    await Ride.findByIdAndUpdate(
      booking.ride._id,
      {
        $inc: { availableSeats: booking.seats },
      },
      { new: true }
    );
  }

  const passengerId = booking.user?._id || booking.user;
  if (passengerId && booking.ride) {
    await createNotification({
      user: passengerId,
      type: "booking_cancelled",
      message: `You cancelled your booking from ${booking.ride.source} to ${booking.ride.destination}.`,
      metadata: {
        ridePublicId: booking.ride.publicId,
        bookingPublicId: booking.publicId,
      },
    });
  }

  const rideCreatorId = booking.ride?.creator?._id || booking.ride?.creator;
  if (rideCreatorId && booking.ride) {
    await createNotification({
      user: rideCreatorId,
      type: "booking_cancelled",
      message: `${req.user?.name || "Someone"} cancelled a booking on your ride from ${booking.ride.source} to ${booking.ride.destination}.`,
      metadata: {
        ridePublicId: booking.ride.publicId,
        bookingPublicId: booking.publicId,
      },
    });
  }

  const populated = await Booking.findById(booking._id)
    .populate({
      path: "ride",
      populate: { path: "creator" },
    })
    .populate("user");

  return res.json(toBooking(populated));
};

exports.acceptBooking = async (req, res) => {
  const booking = await Booking.findOne({ publicId: req.params.bookingId })
    .populate({
      path: "ride",
      populate: { path: "creator" },
    })
    .populate("user");

  if (!booking) {
    return res.status(404).json({ message: "Booking not found." });
  }

  const creatorId = booking.ride.creator?._id || booking.ride.creator;
  if (String(creatorId) !== String(req.user._id)) {
    return res.status(403).json({ message: "Only the ride creator can accept bookings." });
  }

  if (booking.status !== "Pending") {
    return res.status(400).json({ message: "Only pending bookings can be accepted." });
  }

  booking.status = "Accepted";
  await booking.save();

  const passengerId = booking.user?._id || booking.user;
  if (passengerId) {
    await createNotification({
      user: passengerId,
      type: "booking_accepted",
      message: `Your booking request from ${booking.ride.source} to ${booking.ride.destination} has been accepted!`,
      metadata: {
        ridePublicId: booking.ride.publicId,
        bookingPublicId: booking.publicId,
      },
    });
  }

  return res.json(toBooking(booking));
};

exports.rejectBooking = async (req, res) => {
  const booking = await Booking.findOne({ publicId: req.params.bookingId })
    .populate({
      path: "ride",
      populate: { path: "creator" },
    })
    .populate("user");

  if (!booking) {
    return res.status(404).json({ message: "Booking not found." });
  }

  const creatorId = booking.ride.creator?._id || booking.ride.creator;
  if (String(creatorId) !== String(req.user._id)) {
    return res.status(403).json({ message: "Only the ride creator can reject bookings." });
  }

  if (booking.status !== "Pending") {
    return res.status(400).json({ message: "Only pending bookings can be rejected." });
  }

  booking.status = "Rejected";
  await booking.save();

  // Return seats to the ride
  await Ride.findByIdAndUpdate(booking.ride._id, {
    $inc: { availableSeats: booking.seats },
  });

  const passengerId = booking.user?._id || booking.user;
  if (passengerId) {
    await createNotification({
      user: passengerId,
      type: "booking_rejected",
      message: `Your booking request from ${booking.ride.source} to ${booking.ride.destination} was rejected.`,
      metadata: {
        ridePublicId: booking.ride.publicId,
        bookingPublicId: booking.publicId,
      },
    });
  }

  return res.json(toBooking(booking));
};
