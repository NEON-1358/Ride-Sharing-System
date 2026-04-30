const { mongoose } = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const RideSchema = new mongoose.Schema(
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
    creator: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    source: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    departureTime: {
      type: Date,
      required: true,
      index: true,
    },
    totalSeats: {
      type: Number,
      required: true,
      min: 1,
    },
    availableSeats: {
      type: Number,
      required: true,
      min: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["Open", "Confirmed", "Completed", "Cancelled"],
      default: "Open",
      index: true,
    },
    description: {
      type: String,
      default: "",
      maxlength: 300,
      trim: true,
    },
    completedProcessed: {
      type: Boolean,
      default: false,
    },
    cancelledReason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

RideSchema.index({ source: "text", destination: "text", description: "text" });

// Compound index for efficient searching on dashboard
RideSchema.index({ status: 1, departureTime: 1, availableSeats: 1 });
// Index for source/destination searches (partial text matching)
RideSchema.index({ source: 1, destination: 1 });

module.exports = mongoose.model("Ride", RideSchema);
