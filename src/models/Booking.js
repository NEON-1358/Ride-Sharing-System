const { mongoose } = require("../mongo");
const { v4: uuidv4 } = require("uuid");

const BookingSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: uuidv4,
    },
    publicId: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
    },
    ride: {
      type: String,
      ref: "Ride",
      required: true,
      index: true,
    },
    user: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    seats: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected", "Cancelled", "Completed"],
      default: "Pending",
      index: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

BookingSchema.index({ ride: 1, user: 1, status: 1 });

module.exports = mongoose.model("Booking", BookingSchema);
