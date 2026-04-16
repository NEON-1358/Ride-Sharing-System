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

  if (String(ride.creator._id) === String(req.user._id)) {
    return res.status(400).json({ message: "You cannot book your own ride." });
  }

  if (["Completed", "Cancelled"].includes(ride.status)) {
    return res.status(400).json({ message: "This ride is no longer bookable." });
  }

  const duplicate = await Booking.findOne({
    ride: ride._id,
    user: req.user._id,
    status: "Booked",
  });
  if (duplicate) {
    return res.status(409).json({ message: "You already booked this ride." });
  }

  const updatedRide = await Ride.findOneAndUpdate(
    {
      _id: ride._id,
      availableSeats: { $gte: value.seats },
      status: { $in: ["Open", "Confirmed"] },
    },
    {
      $inc: { availableSeats: -value.seats },
      $set: {
        status: ride.availableSeats - value.seats === 0 ? "Confirmed" : ride.status,
      },
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
  });

  await createNotification({
    user: req.user._id,
    type: "booking_created",
    message: `You booked ${value.seats} seat(s) from ${updatedRide.source} to ${updatedRide.destination}.`,
    metadata: {
      ridePublicId: updatedRide.publicId,
      bookingPublicId: booking.publicId,
    },
  });

  await createNotification({
    user: updatedRide.creator,
    type: "booking_received",
    message: `${req.user.name} booked ${value.seats} seat(s) on your ride from ${updatedRide.source} to ${updatedRide.destination}.`,
    metadata: {
      ridePublicId: updatedRide.publicId,
      bookingPublicId: booking.publicId,
    },
  });

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

  if (String(booking.user._id) !== String(req.user._id)) {
    return res.status(403).json({ message: "Only the booking owner can cancel this booking." });
  }

  if (booking.status !== "Booked") {
    return res.status(400).json({ message: "Only active bookings can be cancelled." });
  }

  if (["Completed", "Cancelled"].includes(booking.ride.status)) {
    return res.status(400).json({ message: "This booking can no longer be cancelled." });
  }

  booking.status = "Cancelled";
  booking.cancelledAt = new Date();
  await booking.save();

  const ride = await Ride.findByIdAndUpdate(
    booking.ride._id,
    {
      $inc: { availableSeats: booking.seats },
      $set: { status: "Open" },
    },
    { new: true }
  );

  await createNotification({
    user: req.user._id,
    type: "booking_cancelled",
    message: `You cancelled your booking from ${ride.source} to ${ride.destination}.`,
    metadata: {
      ridePublicId: ride.publicId,
      bookingPublicId: booking.publicId,
    },
  });

  await createNotification({
    user: booking.ride.creator._id,
    type: "booking_cancelled",
    message: `${req.user.name} cancelled a booking on your ride from ${ride.source} to ${ride.destination}.`,
    metadata: {
      ridePublicId: ride.publicId,
      bookingPublicId: booking.publicId,
    },
  });

  const populated = await Booking.findById(booking._id)
    .populate({
      path: "ride",
      populate: { path: "creator" },
    })
    .populate("user");

  return res.json(toBooking(populated));
};
