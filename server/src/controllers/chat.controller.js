const Message = require("../models/Message");
const Booking = require("../models/Booking");
const Ride = require("../models/Ride");

exports.getChatHistory = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const booking = await Booking.findOne({ publicId: bookingId });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const ride = await Ride.findOne({ _id: booking.ride });
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    // Only passenger or driver can see the chat
    const userMongoId = String(req.user._id);
    const userPublicId = String(req.user.publicId);
    
    const bookingUser = String(booking.user._id || booking.user);
    const rideCreator = String(ride.creator._id || ride.creator);

    const isPassenger = bookingUser === userMongoId || bookingUser === userPublicId;
    const isDriver = rideCreator === userMongoId || rideCreator === userPublicId;

    if (!isPassenger && !isDriver) {
      return res.status(403).json({ message: "Not authorized to view this chat" });
    }

    const messages = await Message.find({ bookingId: bookingId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    console.error("Chat history error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
