const app = require("./src/app");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Message = require("./src/models/Message");
const User = require("./src/models/User");
const Booking = require("./src/models/Booking");
const Ride = require("./src/models/Ride");

const PORT = process.env.PORT || 3000;
const secret = process.env.JWT_SECRET || "secretkey";

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Authentication middleware for Socket.io
io.of("/chat").use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const payload = jwt.verify(token, secret);
    const user = await User.findOne({ publicId: payload.sub });
    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }
    socket.user = user;
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
});

io.of("/chat").on("connection", socket => {
  console.log("User connected to /chat namespace:", socket.user.name);

  socket.on("join", async (room) => {
    if (!room) return;
    console.log(`Socket ${socket.id} (${socket.user.name}) attempting to join room: ${room}`);

    try {
      const booking = await Booking.findOne({ publicId: room }).populate('ride');
      if (!booking) {
        console.warn(`Join failed: Booking ${room} not found`);
        return;
      }

      // Both booking.user and booking.ride.creator are UUID strings
      const isPassenger = String(booking.user) === String(socket.user._id);
      const isDriver = booking.ride && String(booking.ride.creator) === String(socket.user._id);

      if (isPassenger || isDriver) {
        socket.join(String(room));
        console.log(`Socket ${socket.id} joined room: ${room} as ${isDriver ? 'Driver' : 'Passenger'}`);
      } else {
        console.warn(`Join denied: User ${socket.user.name} (${socket.user._id}) is not authorized for booking ${room}`);
        console.log(`Booking User: ${booking.user}, Ride Creator: ${booking.ride?.creator}`);
      }
    } catch (err) {
      console.error("Join room error:", err);
    }
  });

  socket.on("message", async ({ room, text, from, fromName, to }) => {
    if (!room || !text || !from || !to) {
      console.warn("Discarding incomplete message:", { room, text, from, to });
      return;
    }

    console.log(`Message in room ${room} from ${fromName}: ${text}`);

    try {
      // Save to database
      const msg = new Message({
        bookingId: String(room),
        senderId: String(from),
        senderName: String(fromName || "User"),
        receiverId: String(to),
        text: String(text)
      });
      await msg.save();
      
      // Broadcast to everyone in the room (including sender)
      io.of("/chat").to(String(room)).emit("message", { 
        text: String(text), 
        from: String(from), 
        fromName: String(fromName || "User"),
        ts: Date.now() 
      });
      
      console.log(`Message broadcasted to room ${room}`);
    } catch (err) {
      console.error("Message handling error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected from /chat:", socket.id);
  });
});

const locationNamespace = io.of("/location")
locationNamespace.on("connection", (socket) => {
  console.log("User connected to /location namespace")
  socket.on("join_ride_tracking", (rideId) => {
    socket.join(rideId)
    console.log(`User joined tracking for ride ${rideId}`)
  })
  socket.on("update_location", ({ rideId, lat, lng }) => {
    // Broadcast location to everyone in the ride room except sender
    socket.to(rideId).emit("location_updated", { rideId, lat, lng })
  })
  socket.on("disconnect", () => console.log("User disconnected from /location"))
})

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
