const app = require("./src/app");
const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.of("/chat").on("connection", socket => {
  socket.on("join", room => {
    if (room) socket.join(String(room));
  });
  socket.on("message", ({ room, text, from }) => {
    if (room && text) io.of("/chat").to(String(room)).emit("message", { text, from, ts: Date.now() });
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
