const Joi = require("joi");
const Booking = require("../models/Booking");
const Review = require("../models/Review");
const Ride = require("../models/Ride");
const User = require("../models/User");
const { createNotification } = require("../utils/notifications");
const { toReview } = require("../utils/serializers");

const reviewSchema = Joi.object({
  rideId: Joi.string().trim().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().max(240).allow("").optional(),
});

exports.createReview = async (req, res) => {
  const { error, value } = reviewSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      message: error.details.map((detail) => detail.message).join(" "),
    });
  }

  const ride = await Ride.findOne({ publicId: value.rideId }).populate("creator");
  if (!ride) {
    return res.status(404).json({ message: "Ride not found." });
  }

  if (ride.status !== "Completed") {
    return res.status(400).json({ message: "Reviews can only be submitted after ride completion." });
  }

  const completedBooking = await Booking.findOne({
    ride: ride._id,
    user: req.user._id,
    status: "Completed",
  });

  if (!completedBooking) {
    return res.status(403).json({ message: "Only completed passengers can review this ride creator." });
  }

  const existing = await Review.findOne({ ride: ride._id, reviewer: req.user._id });
  if (existing) {
    return res.status(409).json({ message: "You have already reviewed this ride." });
  }

  const review = await Review.create({
    ride: ride._id,
    reviewer: req.user._id,
    reviewee: ride.creator._id,
    rating: value.rating,
    comment: value.comment || "",
  });

  const stats = await Review.aggregate([
    { $match: { reviewee: ride.creator._id } },
    {
      $group: {
        _id: "$reviewee",
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = stats[0] || { average: 0, count: 0 };
  await User.findByIdAndUpdate(ride.creator._id, {
    $set: {
      "ratings.average": Number(summary.average.toFixed(1)),
      "ratings.count": summary.count,
    },
  });

  await createNotification({
    user: ride.creator._id,
    type: "review_received",
    message: `${req.user.name} left you a ${value.rating}-star review.`,
    metadata: {
      ridePublicId: ride.publicId,
    },
  });

  const populated = await Review.findById(review._id).populate("reviewer");
  return res.status(201).json(toReview(populated));
};

exports.listRideReviews = async (req, res) => {
  const ride = await Ride.findOne({ publicId: req.params.rideId });
  if (!ride) {
    return res.status(404).json({ message: "Ride not found." });
  }

  const reviews = await Review.find({ ride: ride._id })
    .populate("reviewer")
    .sort({ createdAt: -1 });

  return res.json(reviews.map(toReview));
};
