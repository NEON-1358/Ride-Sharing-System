const { v4: uuidv4 } = require("uuid");
const { all, get, run, tx } = require("../db");

exports.bookRide = async (req, res) => {
  const { rideId } = req.body || {};
  const riderId = req.user?.id;
  if (!riderId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const ride = await get(`SELECT * FROM rides WHERE id = ?`, [rideId]);
    if (!ride) return res.status(404).json({ message: "Ride not found" });
    if (ride.driverId === riderId) return res.status(400).json({ message: "Cannot book own ride" });
    if (ride.availableSeats <= 0) return res.status(400).json({ message: "No seats available" });

    // Check for existing accepted upcoming ride
    const today = new Date().toISOString().slice(0, 10);
    const hasActive = await get(
      `SELECT b.id FROM bookings b JOIN rides r ON b.rideId = r.id WHERE b.riderId = ? AND b.status = 'accepted' AND r.date >= ?`,
      [riderId, today]
    );
    if (hasActive) return res.status(400).json({ message: "You already have an accepted upcoming ride" });

    const status = ride.isInstantBooking ? "accepted" : "pending";
    const id = uuidv4();

    await tx(async () => {
      await run(
        `INSERT INTO bookings(id, rideId, riderId, driverId, status) VALUES (?,?,?,?,?)`,
        [id, rideId, riderId, ride.driverId, status]
      );
      if (status === "accepted") {
        await run(`UPDATE rides SET availableSeats = availableSeats - 1 WHERE id = ?`, [rideId]);
      }
    });

    res.status(201).json({ id, rideId, status });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getDriverBookings = (req, res) => {
  all(
    `SELECT b.id,b.rideId,b.riderId,b.driverId,b.status,u.name as riderName,u.email as riderEmail
     FROM bookings b
     LEFT JOIN users u ON u.id = b.riderId
     WHERE b.driverId = ?`,
    [req.user.id]
  )
    .then(rows => res.json(rows))
    .catch(() => res.status(500).json({ message: "Server error" }));
};

exports.getRiderBookings = (req, res) => {
  all(`SELECT id,rideId,riderId,driverId,status FROM bookings WHERE riderId = ?`, [req.user.id])
    .then(rows => res.json(rows))
    .catch(() => res.status(500).json({ message: "Server error" }));
};

exports.updateBookingStatus = (req, res) => {
  const { status } = req.body;

  const allowed = ["pending", "accepted", "rejected", "cancelled"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  tx(async () => {
    const booking = await get(`SELECT * FROM bookings WHERE id = ?`, [req.params.id])
    if (!booking) {
      throw { status: 404, message: "Booking not found" }
    }
    if (booking.driverId !== req.user.id) {
      throw { status: 403, message: "Not authorized to update this booking" }
    }
    const prev = booking.status
    if (status === "accepted" && prev !== "accepted") {
      const ride = await get(`SELECT * FROM rides WHERE id = ?`, [booking.rideId])
      if (!ride) throw { status: 404, message: "Ride not found" }
      const seats = Number(ride.availableSeats || 0)
      if (seats <= 0) throw { status: 400, message: "No seats available" }
      await run(`UPDATE rides SET availableSeats = ? WHERE id = ?`, [seats - 1, booking.rideId])
    } else if (status === "rejected" && prev === "accepted") {
      const ride = await get(`SELECT * FROM rides WHERE id = ?`, [booking.rideId])
      if (ride) {
        const seats = Number(ride.availableSeats || 0)
        await run(`UPDATE rides SET availableSeats = ? WHERE id = ?`, [seats + 1, booking.rideId])
      }
    } else if (status === "cancelled" && prev === "accepted") {
      const ride = await get(`SELECT * FROM rides WHERE id = ?`, [booking.rideId])
      if (ride) {
        const seats = Number(ride.availableSeats || 0)
        await run(`UPDATE rides SET availableSeats = ? WHERE id = ?`, [seats + 1, booking.rideId])
      }
    }
    await run(`UPDATE bookings SET status = ? WHERE id = ?`, [status, req.params.id])
  })
    .then(() =>
      get(
        `SELECT b.id,b.rideId,b.riderId,b.driverId,b.status,u.name as riderName,u.email as riderEmail
         FROM bookings b LEFT JOIN users u ON u.id = b.riderId WHERE b.id = ?`,
        [req.params.id]
      )
    )
    .then(enriched => res.json(enriched))
    .catch(e => {
      if (e && e.status) return res.status(e.status).json({ message: e.message })
      res.status(500).json({ message: "Server error" })
    });
};

exports.cancelBookingByRider = (req, res) => {
  tx(async () => {
    const booking = await get(`SELECT * FROM bookings WHERE id = ?`, [req.params.id])
    if (!booking) throw { status: 404, message: "Booking not found" }
    if (booking.riderId !== req.user.id) throw { status: 403, message: "Not authorized to cancel this booking" }
    if (booking.status === "accepted") {
      const ride = await get(`SELECT * FROM rides WHERE id = ?`, [booking.rideId])
      if (ride) {
        const seats = Number(ride.availableSeats || 0)
        await run(`UPDATE rides SET availableSeats = ? WHERE id = ?`, [seats + 1, booking.rideId])
      }
    }
    await run(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`, [req.params.id])
  })
    .then(() =>
      get(
        `SELECT b.id,b.rideId,b.riderId,b.driverId,b.status,u.name as riderName,u.email as riderEmail
         FROM bookings b LEFT JOIN users u ON u.id = b.riderId WHERE b.id = ?`,
        [req.params.id]
      )
    )
    .then(enriched => res.json(enriched))
    .catch(e => {
      if (e && e.status) return res.status(e.status).json({ message: e.message })
      res.status(500).json({ message: "Server error" })
    });
};
