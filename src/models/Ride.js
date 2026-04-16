const { mongoose } = require("../mongo");
const { v4: uuidv4 } = require("uuid");

const RideSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
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

module.exports = mongoose.model("Ride", RideSchema);
