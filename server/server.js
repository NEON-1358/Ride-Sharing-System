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
const io = new Server(server, { 
  cors: { 
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

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
  
  // Join a private room for global notifications
  socket.join(`user_${socket.user.publicId}`);
  console.log(`User ${socket.user.name} joined global notification room: user_${socket.user.publicId}`);

  socket.on("join", async (room) => {
    if (!room) {
      console.warn("Join failed: No room ID provided");
      return;
    }
    const roomStr = String(room);
    console.log(`Socket ${socket.id} (${socket.user.name}) attempting to join room: ${roomStr}`);

    try {
      // Find booking by publicId or _id for robustness
      const booking = await Booking.findOne({ 
        $or: [{ publicId: roomStr }, { _id: roomStr }] 
      }).populate('ride');

      if (!booking) {
        console.warn(`Join failed: Booking ${roomStr} not found in database`);
        return;
      }

      const userMongoId = String(socket.user._id);
      const userPublicId = String(socket.user.publicId);

      const bookingUser = String(booking.user._id || booking.user);
      const rideCreator = booking.ride ? String(booking.ride.creator._id || booking.ride.creator) : null;

      const isPassenger = bookingUser === userMongoId || bookingUser === userPublicId;
      const isDriver = rideCreator && (rideCreator === userMongoId || rideCreator === userPublicId);

      if (isPassenger || isDriver) {
        socket.join(roomStr);
        console.log(`SUCCESS: Socket ${socket.id} joined room: ${roomStr} as ${isDriver ? 'Driver' : 'Passenger'}`);
        
        // Broadcast to everyone in the room that someone joined
        io.of("/chat").to(roomStr).emit("user_joined", { 
          user: socket.user.name,
          role: isDriver ? 'driver' : 'passenger'
        });

        socket.emit("joined", { room: roomStr, role: isDriver ? 'driver' : 'passenger' });
      } else {
        console.warn(`Join DENIED: User ${socket.user.name} is not authorized for booking ${roomStr}`);
        console.log(`DEBUG AUTH: UserMongo=${userMongoId}, UserPublic=${userPublicId}, BookingUser=${bookingUser}, RideCreator=${rideCreator}`);
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

    const roomStr = String(room);
    
    // Security: Verify the sender is authorized for this room
    // Instead of just checking socket.rooms, let's log the status and allow if they should be there
    if (!socket.rooms.has(roomStr)) {
      console.log(`Socket ${socket.id} not in room ${roomStr}. Current rooms:`, Array.from(socket.rooms));
      
      // Auto-join if they are authorized (to handle reconnection edge cases)
      try {
        const booking = await Booking.findOne({ 
          $or: [{ publicId: roomStr }, { _id: roomStr }] 
        }).populate('ride');

        if (booking) {
          const userMongoId = String(socket.user._id);
          const userPublicId = String(socket.user.publicId);
          const bookingUser = String(booking.user._id || booking.user);
          const rideCreator = booking.ride ? String(booking.ride.creator._id || booking.ride.creator) : null;

          if (bookingUser === userMongoId || bookingUser === userPublicId || 
              (rideCreator && (rideCreator === userMongoId || rideCreator === userPublicId))) {
            socket.join(roomStr);
            console.log(`Auto-joined socket ${socket.id} to room ${roomStr} during message send`);
          } else {
            console.warn(`Unauthorized message: User ${socket.user.name} not part of booking ${roomStr}`);
            return;
          }
        } else {
          console.warn(`Unauthorized message: Booking ${roomStr} not found`);
          return;
        }
      } catch (err) {
        console.error("Authorization check error:", err);
        return;
      }
    }

    console.log(`Message in room ${roomStr} from ${fromName} (ID: ${from}) to (ID: ${to}): ${text}`);

    try {
      // Save to database
      const msg = new Message({
        bookingId: roomStr,
        senderId: String(from),
        senderName: String(fromName || "User"),
        receiverId: String(to),
        text: String(text)
      });
      await msg.save();
      
      const messageData = { 
        text: String(text), 
        from: String(from), 
        fromName: String(fromName || "User"),
        ts: Date.now() 
      };

      // Broadcast to EVERYONE in the room including the sender
      io.of("/chat").to(roomStr).emit("message", messageData);
      
      console.log(`Message broadcasted to room ${roomStr}. Total clients in room: ${io.of("/chat").adapter.rooms.get(roomStr)?.size || 0}`);

      // Also send a global notification to the receiver's private room
      io.of("/chat").to(`user_${to}`).emit("new_message_notification", {
        bookingId: roomStr,
        text: String(text),
        fromName: String(fromName || "User"),
        fromId: String(from)
      });
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
