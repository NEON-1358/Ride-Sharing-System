const { mongoose } = require("../mongo");
const { v4: uuidv4 } = require("uuid");

const NotificationSchema = new mongoose.Schema(
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
    user: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      ridePublicId: { type: String, default: "" },
      bookingPublicId: { type: String, default: "" },
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
