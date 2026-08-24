const Joi = require("joi");
const Booking = require("../models/Booking");
const Ride = require("../models/Ride");
const { getUserModel } = require("../models/User");
const userStore = require("../utils/userStore");
const { createNotification } = require("../utils/notifications");
const { toRideCard } = require("../utils/serializers");

const rideSchema = Joi.object({
  source: Joi.string().trim().min(3).max(100).required().messages({
    'string.min': 'Source location must be at least 3 characters long',
    'any.required': 'Source location is required'
  }),
  destination: Joi.string().trim().min(3).max(100).required().messages({
    'string.min': 'Destination location must be at least 3 characters long',
    'any.required': 'Destination location is required'
  }),
  departureTime: Joi.date().iso().greater("now").required().messages({
    'date.greater': 'Departure time must be in the future',
    'any.required': 'Departure time is required'
  }),
  totalSeats: Joi.number().integer().min(1).max(8).required().messages({
    'number.min': 'At least 1 seat must be offered',
    'number.max': 'You cannot offer more than 8 seats in a standard ride'
  }),
  price: Joi.number().min(50).max(5000).required().messages({
    'number.min': 'Price must be at least ₹50',
    'number.max': 'Price cannot exceed ₹5000'
  }),
  description: Joi.string().trim().max(300).allow("").optional(),
  sourceCoords: Joi.array().items(Joi.number()).length(2).optional(),
  destinationCoords: Joi.array().items(Joi.number()).length(2).optional(),
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

async function loadRideForOutput(rideId, currentUser) {
  const ride = await Ride.findById(rideId).populate("creator");
  const passengers = await Booking.find({ ride: rideId, status: { $in: ["Pending", "Accepted", "Completed"] } })
    .populate("user")
    .sort({ createdAt: 1 });

  return toRideCard(
    {
      ...ride.toObject(),
      passengers,
    },
    currentUser
  );
}

async function processCompletion(ride) {
  if (ride.completedProcessed) return;

  const bookings = await Booking.find({ ride: ride._id, status: "Accepted" });
  const userSeatCounts = new Map();

  // Fare Calculation & Payment Simulation
  const basePrice = ride.price;
  const surgeMultiplier = Math.random() * (1.5 - 1.0) + 1.0; // Random surge between 1.0x and 1.5x
  
  for (const booking of bookings) {
    // Calculate final fare: (Base Price * Seats) * Surge
    const calculatedFare = Math.round((basePrice * booking.seats) * surgeMultiplier);
    
    booking.status = "Completed";
    booking.finalFare = calculatedFare;
    booking.paymentStatus = "Paid"; // Simulate successful payment
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

  if (req.query.dateFrom) {
    query.departureTime.$gte = new Date(req.query.dateFrom);
  }

  if (req.query.dateTo) {
    query.departureTime.$lte = new Date(req.query.dateTo);
  }
} else {
  // Never show rides that have already departed
  query.departureTime = { $gte: new Date() };
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
        req.user
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
      req.user
    )
  );
};

async function verifyLocation(name) {
  try {
    // Attempt 1: India-specific search
    let response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(name)}&limit=1&countrycodes=in&accept-language=en`);
    let data = await response.json();

    // Attempt 2: Global search fallback
    if (!data || data.length === 0) {
      response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(name)}&limit=1&accept-language=en`);
      data = await response.json();
    }

    return data && data.length > 0;
  } catch (err) {
    console.error("Geocoding verification error:", err);
    return true; // Fallback to true if API is down to avoid blocking users
  }
}

exports.createRide = async (req, res, next) => {
  try {
    const { error, value } = rideSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Strict Backend verification of locations
    const [isSourceValid, isDestValid] = await Promise.all([
      verifyLocation(value.source),
      verifyLocation(value.destination)
    ]);

    if (!isSourceValid) {
      return res.status(400).json({ message: `The location '${value.source}' could not be verified on the map. Please use a real address.` });
    }
    if (!isDestValid) {
      return res.status(400).json({ message: `The location '${value.destination}' could not be verified on the map. Please use a real address.` });
    }

    const ride = await Ride.create({
      ...value,
      availableSeats: value.totalSeats,
      creator: req.user._id,
      sourceCoords: value.sourceCoords ? { type: "Point", coordinates: value.sourceCoords } : undefined,
      destinationCoords: value.destinationCoords ? { type: "Point", coordinates: value.destinationCoords } : undefined,
      currentLocation: value.sourceCoords ? { type: "Point", coordinates: value.sourceCoords } : undefined,
    });

    const populatedRide = await loadRideForOutput(ride._id, req.user.publicId);
    return res.status(201).json(populatedRide);
  } catch (err) {
    console.error("Error in createRide controller:", err);
    next(err);
  }
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

exports.updateRideLocation = async (req, res) => {
  const { lat, lon } = req.body;
  if (lat === undefined || lon === undefined) {
    return res.status(400).json({ message: "Latitude and longitude are required." });
  }

  const ride = await Ride.findOne({ publicId: req.params.rideId });
  if (!ride) {
    return res.status(404).json({ message: "Ride not found." });
  }

  const rideCreatorId = ride.creator?._id || ride.creator;
  if (String(rideCreatorId) !== String(req.user._id)) {
    return res.status(403).json({ message: "Only the ride creator can update the location." });
  }

  if (ride.status !== "In Progress") {
    return res.status(400).json({ message: "Location can only be updated while the ride is In Progress." });
  }

  ride.currentLocation = { type: "Point", coordinates: [parseFloat(lon), parseFloat(lat)] };
  await ride.save();

  return res.json({ message: "Location updated successfully." });
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

  if (!["Open", "Confirmed", "In Progress", "Completed", "Cancelled"].includes(status)) {
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

  if (status === "In Progress") {
    if (!["Open", "Confirmed"].includes(ride.status)) {
      return res.status(400).json({ message: "Only open or confirmed rides can be started." });
    }
    
    // Also verify there's at least one accepted passenger
    const acceptedCount = await Booking.countDocuments({ ride: ride._id, status: "Accepted" });
    if (acceptedCount === 0) {
      return res.status(400).json({ message: "You cannot start a ride without at least one accepted passenger." });
    }

    ride.status = "In Progress";
    await ride.save();
    
    // Notify all accepted passengers that the ride has started
    const acceptedBookings = await Booking.find({ ride: ride._id, status: "Accepted" });
    for (const booking of acceptedBookings) {
      await createNotification({
        user: booking.user,
        type: "ride_started",
        message: `Your ride from ${ride.source} to ${ride.destination} has started!`,
        metadata: { ridePublicId: ride.publicId },
      });
    }
  } else if (status === "Completed") {
    if (ride.status === "Cancelled") {
      return res.status(400).json({ message: "Cancelled rides cannot be completed." });
    }

    // Check if there are any accepted bookings
    const acceptedBookingsCount = await Booking.countDocuments({ 
      ride: ride._id, 
      status: "Accepted" 
    });

    if (acceptedBookingsCount === 0) {
      return res.status(400).json({ 
        message: "You cannot mark a ride as completed if no passengers have been accepted." 
      });
    }

    // New check: Cannot complete a ride that hasn't reached its departure time
    const now = new Date();
    if (new Date(ride.departureTime) > now) {
      return res.status(400).json({ 
        message: "You cannot mark a ride as completed before its scheduled departure time." 
      });
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
