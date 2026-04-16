const { mongoose } = require("../mongo");
const { v4: uuidv4 } = require("uuid");

const BookingSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
    },
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
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
      enum: ["Booked", "Cancelled", "Completed"],
      default: "Booked",
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
