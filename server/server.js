const app = require("./src/app");
const http = require("http");
const { Server } = require("socket.io");
const Message = require("./src/models/Message");

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.of("/chat").on("connection", socket => {
  console.log("User connected to /chat namespace:", socket.id);

  socket.on("join", room => {
    console.log(`Socket ${socket.id} joining room: ${room}`);
    if (room) socket.join(String(room));
  });

  socket.on("message", async ({ room, text, from, fromName, to }) => {
    console.log(`Message from ${fromName} (${from}) in room ${room}: ${text}`);
    if (room && text && from && to) {
      try {
        const msg = new Message({
          rideId: String(room),
          senderId: String(from),
          senderName: String(fromName || "User"),
          receiverId: String(to),
          text: String(text)
        });
        await msg.save();
        console.log("Message saved to DB");
        
        io.of("/chat").to(String(room)).emit("message", { 
          text: String(text), 
          from: String(from), 
          fromName: String(fromName || "User"),
          ts: Date.now() 
        });
      } catch (err) {
        console.error("Socket save error:", err);
      }
    } else {
      console.warn("Missing message fields:", { room, text, from, to });
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
