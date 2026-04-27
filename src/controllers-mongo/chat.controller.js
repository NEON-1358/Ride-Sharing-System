const Message = require("../models/Message");
const Booking = require("../models/Booking");
const Ride = require("../models/Ride");

exports.getChatHistory = async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user.id;

  try {
    const booking = await Booking.findOne({ publicId: bookingId });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const ride = await Ride.findOne({ publicId: booking.rideId });
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    // Only passenger or driver can see the chat
    if (booking.userId !== userId && ride.creatorId !== userId) {
      return res.status(403).json({ message: "Not authorized to view this chat" });
    }

    const messages = await Message.find({ rideId: bookingId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    console.error("Chat history error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
