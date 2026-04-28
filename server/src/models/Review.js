const { mongoose } = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const ReviewSchema = new mongoose.Schema(
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
    reviewer: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    reviewee: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: "",
      maxlength: 240,
      trim: true,
    },
  },
  { timestamps: true }
);

ReviewSchema.index({ ride: 1, reviewer: 1 }, { unique: true });

module.exports = mongoose.model("Review", ReviewSchema);
