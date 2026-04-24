const Joi = require("joi");
const Booking = require("../models/Booking");
const Ride = require("../models/Ride");
const User = require("../models/User");
const { createNotification } = require("../utils/notifications");
const { toRideCard } = require("../utils/serializers");

const rideSchema = Joi.object({
  source: Joi.string().trim().min(2).max(80).required(),
  destination: Joi.string().trim().min(2).max(80).required(),
  departureTime: Joi.date().iso().greater("now").required(),
  totalSeats: Joi.number().integer().min(1).max(10).required(),
  price: Joi.number().min(0).required(),
  description: Joi.string().trim().max(300).allow("").optional(),
});

const rideUpdateSchema = Joi.object({
  source: Joi.string().trim().min(2).max(80).optional(),
  destination: Joi.string().trim().min(2).max(80).optional(),
  departureTime: Joi.date().iso().optional(),
  totalSeats: Joi.number().integer().min(1).max(10).optional(),
  price: Joi.number().min(0).optional(),
  description: Joi.string().trim().max(300).allow("").optional(),
  status: Joi.string().valid("Open", "Confirmed", "Completed", "Cancelled").optional(),
  cancelledReason: Joi.string().trim().max(200).allow("").optional(),
}).min(1);

async function loadRideForOutput(rideId, currentUserPublicId) {
  const ride = await Ride.findById(rideId).populate("creator");
  const passengers = await Booking.find({ ride: rideId, status: { $in: ["Pending", "Accepted", "Completed"] } })
    .populate("user")
    .sort({ createdAt: 1 });

  return toRideCard(
    {
      ...ride.toObject(),
      passengers,
    },
    currentUserPublicId
  );
}

async function processCompletion(ride) {
  if (ride.completedProcessed) return;

  const bookings = await Booking.find({ ride: ride._id, status: "Accepted" });
  const userSeatCounts = new Map();

  for (const booking of bookings) {
    booking.status = "Completed";
    await booking.save();

    const previous = userSeatCounts.get(String(booking.user)) || 0;
    userSeatCounts.set(String(booking.user), previous + booking.seats);
  }

  // Handle pending bookings (they get cancelled as they weren't accepted in time)
  await Booking.updateMany({ ride: ride._id, status: "Pending" }, { status: "Cancelled", cancelledAt: new Date() });

  await User.findByIdAndUpdate(ride.creator, { $inc: { totalRidesParticipated: 1 } });
  for (const [userId, seats] of userSeatCounts.entries()) {
    await User.findByIdAndUpdate(userId, { $inc: { totalRidesParticipated: seats } });
  }

  ride.completedProcessed = true;
  await ride.save();
}

async function cancelRideAndBookings(ride, actor, cancelledReason = "") {
  const activeBookings = await Booking.find({ ride: ride._id, status: { $in: ["Pending", "Accepted"] } }).populate("user");

  for (const booking of activeBookings) {
    booking.status = "Cancelled";
    booking.cancelledAt = new Date();
    await booking.save();

    const passengerId = booking.user?._id || booking.user;
    if (passengerId) {
      await createNotification({
        user: passengerId,
        type: "ride_cancelled",
        message: `Ride from ${ride.source} to ${ride.destination} was cancelled.`,
        metadata: {
          ridePublicId: ride.publicId,
          bookingPublicId: booking.publicId,
        },
      });
    }
  }

  ride.status = "Cancelled";
  ride.cancelledReason = cancelledReason || `Cancelled by ${actor?.name || "System"}`;
  ride.availableSeats = ride.totalSeats;
  await ride.save();
}

exports.listRides = async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(12, Math.max(1, Number(req.query.limit || 6)));
  const skip = (page - 1) * limit;
  const query = {};

  if (req.query.status) {
    query.status = req.query.status;
  } else if (req.query.mine === "true") {
    query.status = { $ne: "Cancelled" };
  } else {
    // For dashboard, only show bookable rides
    query.status = "Open";
  }

  if (req.query.source) {
    query.source = { $regex: req.query.source.trim(), $options: "i" };
  }

  if (req.query.destination) {
    query.destination = { $regex: req.query.destination.trim(), $options: "i" };
  }

  if (req.query.dateFrom || req.query.dateTo) {
    query.departureTime = {};
    if (req.query.dateFrom) query.departureTime.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) query.departureTime.$lte = new Date(req.query.dateTo);
  }

  if (req.query.seats) {
    query.availableSeats = { $gte: Number(req.query.seats) };
  }

  if (req.user) {
    if (req.query.mine === "true") {
      query.creator = req.user._id;
    } else {
      // For dashboard, don't show user's own rides since they can't book them
      query.creator = { $ne: req.user._id };
    }
  } else if (req.query.mine === "true") {
    // If mine=true but no user, return empty results
    return res.json({
      items: [],
      pagination: { page, limit, total: 0, totalPages: 1 },
    });
  }

  const [total, rides] = await Promise.all([
    Ride.countDocuments(query),
    Ride.find(query)
      .populate("creator")
      .sort({ departureTime: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);

  const rideIds = rides.map((ride) => ride._id);
  const bookingDocs = await Booking.find({
    ride: { $in: rideIds },
    status: { $in: ["Pending", "Accepted", "Completed"] },
  }).populate("user");

  const bookingMap = bookingDocs.reduce((map, booking) => {
    const key = String(booking.ride);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(booking);
    return map;
  }, new Map());

  return res.json({
    items: rides.map((ride) =>
      toRideCard(
        {
          ...ride.toObject(),
          passengers: bookingMap.get(String(ride._id)) || [],
        },
        req.user?.publicId
      )
    ),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
};

exports.getRide = async (req, res) => {
  const ride = await Ride.findOne({ publicId: req.params.rideId }).populate("creator");
  if (!ride) {
    return res.status(404).json({ message: "Ride not found." });
  }

  const passengers = await Booking.find({ ride: ride._id, status: { $in: ["Pending", "Accepted", "Completed"] } })
    .populate("user")
    .sort({ createdAt: 1 });

  return res.json(
    toRideCard(
      {
        ...ride.toObject(),
        passengers,
      },
      req.user?.publicId
    )
  );
};

exports.createRide = async (req, res) => {
  const { error, value } = rideSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      message: error.details.map((detail) => detail.message).join(" "),
    });
  }

  const ride = await Ride.create({
    creator: req.user._id,
    source: value.source,
    destination: value.destination,
    departureTime: value.departureTime,
    totalSeats: value.totalSeats,
    availableSeats: value.totalSeats,
    price: value.price,
    description: value.description || "",
  });

  return res.status(201).json(await loadRideForOutput(ride._id, req.user.publicId));
};

exports.updateRide = async (req, res) => {
  const { error, value } = rideUpdateSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      message: error.details.map((detail) => detail.message).join(" "),
    });
  }

  const ride = await Ride.findOne({ publicId: req.params.rideId });
  if (!ride) {
    return res.status(404).json({ message: "Ride not found." });
  }

  const rideCreatorId = ride.creator?._id || ride.creator;
  if (String(rideCreatorId) !== String(req.user._id)) {
    return res.status(403).json({ message: "Only the ride creator can update this ride." });
  }

  if (["Completed", "Cancelled"].includes(ride.status)) {
    return res.status(400).json({ message: "Completed or cancelled rides cannot be edited." });
  }

  const activeBookings = await Booking.find({ ride: ride._id, status: { $in: ["Pending", "Accepted"] } });
  const reservedSeats = activeBookings.reduce((sum, booking) => sum + booking.seats, 0);

  if (value.totalSeats && value.totalSeats < reservedSeats) {
    return res.status(400).json({ message: "Total seats cannot be lower than already booked seats." });
  }

  if (value.departureTime && new Date(value.departureTime) <= new Date()) {
    return res.status(400).json({ message: "Departure time must be in the future." });
  }

  Object.assign(ride, value);
  if (value.totalSeats) {
    ride.availableSeats = value.totalSeats - reservedSeats;
    if (ride.availableSeats < 0) ride.availableSeats = 0;
  }

  if (ride.availableSeats === 0 && ride.status === "Open") {
    ride.status = "Confirmed";
  } else if (ride.availableSeats > 0 && ride.status === "Confirmed") {
    ride.status = "Open";
  }

  await ride.save();
  return res.json(await loadRideForOutput(ride._id, req.user.publicId));
};

exports.deleteRide = async (req, res) => {
  const ride = await Ride.findOne({ publicId: req.params.rideId });
  if (!ride) {
    return res.status(404).json({ message: "Ride not found." });
  }

  const rideCreatorId = ride.creator?._id || ride.creator;
  if (String(rideCreatorId) !== String(req.user._id)) {
    return res.status(403).json({ message: "Only the ride creator can delete this ride." });
  }

  const activeCount = await Booking.countDocuments({ ride: ride._id, status: { $in: ["Pending", "Accepted"] } });
  if (activeCount > 0) {
    await cancelRideAndBookings(ride, req.user, "Ride deleted after bookings existed.");
    return res.json({ message: "Ride had bookings, so it was cancelled instead of hard deleted." });
  }

  await Ride.deleteOne({ _id: ride._id });
  await Booking.deleteMany({ ride: ride._id });
  return res.json({ message: "Ride deleted successfully." });
};

exports.updateRideStatus = async (req, res) => {
  const status = req.body.status;
  const cancelledReason = typeof req.body.cancelledReason === "string" ? req.body.cancelledReason.trim() : "";

  if (!["Open", "Confirmed", "Completed", "Cancelled"].includes(status)) {
    return res.status(400).json({ message: "Invalid ride status." });
  }

  const ride = await Ride.findOne({ publicId: req.params.rideId });
  if (!ride) {
    return res.status(404).json({ message: "Ride not found." });
  }

  const rideCreatorId = ride.creator?._id || ride.creator;
  if (String(rideCreatorId) !== String(req.user._id)) {
    return res.status(403).json({ message: "Only the ride creator can update this ride status." });
  }

  if (status === "Completed") {
    if (ride.status === "Cancelled") {
      return res.status(400).json({ message: "Cancelled rides cannot be completed." });
    }
    ride.status = "Completed";
    await ride.save();
    await processCompletion(ride);

    const completedBookings = await Booking.find({ ride: ride._id, status: "Completed" });
    for (const booking of completedBookings) {
      await createNotification({
        user: booking.user,
        type: "ride_completed",
        message: `Your ride from ${ride.source} to ${ride.destination} has been marked completed. You can now leave a review.`,
        metadata: {
          ridePublicId: ride.publicId,
          bookingPublicId: booking.publicId,
        },
      });
    }
  } else if (status === "Cancelled") {
    await cancelRideAndBookings(ride, req.user, cancelledReason);
  } else {
    ride.status = status;
    await ride.save();
  }

  return res.json(await loadRideForOutput(ride._id, req.user.publicId));
};
