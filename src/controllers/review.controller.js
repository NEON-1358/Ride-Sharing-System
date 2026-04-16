const { v4: uuidv4 } = require("uuid")
const { all, get, run } = require("../db")

exports.createReview = async (req, res) => {
  const { rideId, toUserId, rating, comment } = req.body || {}
  const fromUserId = req.user?.id
  if (!fromUserId) return res.status(401).json({ message: "Unauthorized" })
  if (!rideId || !toUserId || !rating) return res.status(400).json({ message: "Missing fields" })
  const r = Number(rating)
  if (isNaN(r) || r < 1 || r > 5) return res.status(400).json({ message: "Invalid rating" })
  try {
    const ride = await get(`SELECT * FROM rides WHERE id = ?`, [rideId])
    if (!ride) return res.status(404).json({ message: "Ride not found" })
    const participation = await all(
      `SELECT * FROM bookings WHERE rideId = ? AND (riderId = ? OR driverId = ?)`,
      [rideId, fromUserId, fromUserId]
    )
    if (!participation || participation.length === 0) return res.status(403).json({ message: "Not part of this ride" })
    const dup = await get(
      `SELECT id FROM reviews WHERE rideId = ? AND fromUserId = ? AND toUserId = ?`,
      [rideId, fromUserId, toUserId]
    )
    if (dup) return res.status(400).json({ message: "Already reviewed" })
    const id = uuidv4()
    const createdAt = new Date().toISOString()
    await run(
      `INSERT INTO reviews(id,rideId,fromUserId,toUserId,rating,comment,createdAt) VALUES (?,?,?,?,?,?,?)`,
      [id, rideId, fromUserId, toUserId, r, comment || null, createdAt]
    )
    res.status(201).json({ id, rideId, fromUserId, toUserId, rating: r, comment: comment || null, createdAt })
  } catch {
    res.status(500).json({ message: "Server error" })
  }
}

exports.getReviewsForUser = async (req, res) => {
  try {
    const rows = await all(`SELECT * FROM reviews WHERE toUserId = ? ORDER BY createdAt DESC`, [req.params.userId])
    const avgRow = await get(`SELECT AVG(rating) as avg FROM reviews WHERE toUserId = ?`, [req.params.userId])
    res.json({ average: avgRow?.avg || 0, reviews: rows })
  } catch {
    res.status(500).json({ message: "Server error" })
  }
}

exports.getReviewsForRide = async (req, res) => {
  try {
    const rows = await all(`SELECT * FROM reviews WHERE rideId = ? ORDER BY createdAt DESC`, [req.params.rideId])
    res.json(rows)
  } catch {
    res.status(500).json({ message: "Server error" })
  }
}
