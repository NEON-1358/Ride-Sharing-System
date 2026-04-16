const { v4: uuidv4 } = require("uuid");
const { all, get, run } = require("../db");

exports.createRide = async (req, res) => {
  const { from, to, date, price, availableSeats, isLadiesOnly, isInstantBooking, stops, carModel, distanceKm } = req.body || {};
  const driverId = req.user?.id;
  if (!driverId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const user = await get(`SELECT carModel FROM users WHERE id = ?`, [driverId]);
    if (!user || !user.carModel) {
      return res.status(400).json({ 
        message: "Vehicle details required to publish a ride.", 
        requireVehicle: true 
      });
    }

    const id = uuidv4();
    await run(
      `INSERT INTO rides(id, driverId, fromCity, toCity, date, price, availableSeats, isLadiesOnly, isInstantBooking, stops, carModel, distanceKm) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, driverId, from, to, date, price, availableSeats, isLadiesOnly ? 1 : 0, isInstantBooking ? 1 : 0, stops ? JSON.stringify(stops) : null, carModel || user.carModel, distanceKm || null]
    );
    res.status(201).json({ id, from, to, date, price, availableSeats });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAllRides = async (req, res) => {
  const { from, to, date, minPrice, maxPrice, isLadiesOnly } = req.query || {};
  let sql = `SELECT r.*, u.name as driverName, u.gender as driverGender FROM rides r JOIN users u ON r.driverId = u.id WHERE r.availableSeats > 0`;
  const params = [];

  if (from) { sql += ` AND r.fromCity LIKE ?`; params.push(`%${from}%`); }
  if (to) { sql += ` AND r.toCity LIKE ?`; params.push(`%${to}%`); }
  if (date) { sql += ` AND r.date = ?`; params.push(date); }
  if (minPrice) { sql += ` AND r.price >= ?`; params.push(Number(minPrice)); }
  if (maxPrice) { sql += ` AND r.price <= ?`; params.push(Number(maxPrice)); }
  if (isLadiesOnly === "true") { sql += ` AND r.isLadiesOnly = 1`; }

  try {
    const rows = await all(sql, params);
    const enriched = rows.map(r => ({
      ...r,
      stops: r.stops ? JSON.parse(r.stops) : [],
      isLadiesOnly: !!r.isLadiesOnly,
      isInstantBooking: !!r.isInstantBooking
    }));
    res.json(enriched);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

exports.suggestPrice = (req, res) => {
  const { distanceKm } = req.query || {};
  if (!distanceKm) return res.status(400).json({ message: "Distance required" });
  
  // BlaBlaCar style: fair contribution (e.g. ₹5-8 per km)
  const ratePerKm = 6; 
  const suggested = Math.round(Number(distanceKm) * ratePerKm);
  res.json({ suggested, ratePerKm });
};

exports.getRideById = (req, res) => {
  get(`SELECT id,driverId,fromCity as [from],toCity as [to],date,price,availableSeats FROM rides WHERE id = ?`, [req.params.id])
    .then(ride => {
      if (!ride) return res.status(404).json({ message: "Ride not found" });
      res.json(ride);
    })
    .catch(() => res.status(500).json({ message: "Server error" }));
};

exports.updateRide = (req, res) => {
  get(`SELECT * FROM rides WHERE id = ?`, [req.params.id])
    .then(ride => {
      if (!ride) return res.status(404).json({ message: "Ride not found" });
      if (ride.driverId !== req.user.id) return res.status(403).json({ message: "Not authorized to update this ride" });
      const fields = []
      const params = []
      if (req.body.from !== undefined) { fields.push("fromCity = ?"); params.push(req.body.from) }
      if (req.body.to !== undefined) { fields.push("toCity = ?"); params.push(req.body.to) }
      if (req.body.date !== undefined) { fields.push("date = ?"); params.push(req.body.date) }
      if (req.body.price !== undefined) { fields.push("price = ?"); params.push(req.body.price) }
      if (req.body.availableSeats !== undefined) { fields.push("availableSeats = ?"); params.push(req.body.availableSeats) }
      if (fields.length === 0) return res.json({ id: ride.id, driverId: ride.driverId, from: ride.fromCity, to: ride.toCity, date: ride.date, price: ride.price, availableSeats: ride.availableSeats })
      params.push(req.params.id)
      return run(`UPDATE rides SET ${fields.join(", ")} WHERE id = ?`, params).then(() =>
        get(`SELECT id,driverId,fromCity as [from],toCity as [to],date,price,availableSeats FROM rides WHERE id = ?`, [req.params.id])
      ).then(updated => res.json(updated))
    })
    .catch(() => res.status(500).json({ message: "Server error" }));
};

exports.deleteRide = (req, res) => {
  get(`SELECT * FROM rides WHERE id = ?`, [req.params.id])
    .then(ride => {
      if (!ride) return res.status(404).json({ message: "Ride not found" });
      if (ride.driverId !== req.user.id) return res.status(403).json({ message: "Not authorized to delete this ride" });
      return run(`DELETE FROM rides WHERE id = ?`, [req.params.id]).then(() =>
        run(`UPDATE bookings SET status = 'cancelled' WHERE rideId = ? AND status = 'accepted'`, [req.params.id])
      ).then(() => res.json({ message: "Ride deleted successfully" }))
    })
    .catch(() => res.status(500).json({ message: "Server error" }));
};
