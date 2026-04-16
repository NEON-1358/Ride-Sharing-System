const path = require("path")
const fs = require("fs")
const sqlite3 = require("sqlite3").verbose()
const { readFile } = require("./utils/file.util")

const dbPath = path.join(__dirname, "..", "data", "app.db")
fs.mkdirSync(path.join(__dirname, "..", "data"), { recursive: true })
const db = new sqlite3.Database(dbPath)

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err)
      else resolve(this)
    })
  })
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err)
      else resolve(row)
    })
  })
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
}

async function init() {
  await run(`PRAGMA foreign_keys = ON`)
  await run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    gender TEXT,
    chattiness TEXT DEFAULT 'BlaBla',
    carModel TEXT,
    carColor TEXT,
    carPlate TEXT,
    emailVerified INTEGER DEFAULT 0,
    phoneVerified INTEGER DEFAULT 0,
    govIdVerified INTEGER DEFAULT 0
  )`)
  try { await run(`ALTER TABLE users ADD COLUMN gender TEXT`) } catch {}
  try { await run(`ALTER TABLE users ADD COLUMN chattiness TEXT DEFAULT 'BlaBla'`) } catch {}
  try { await run(`ALTER TABLE users ADD COLUMN carModel TEXT`) } catch {}
  try { await run(`ALTER TABLE users ADD COLUMN carColor TEXT`) } catch {}
  try { await run(`ALTER TABLE users ADD COLUMN carPlate TEXT`) } catch {}
  try { await run(`ALTER TABLE users ADD COLUMN emailVerified INTEGER DEFAULT 0`) } catch {}
  try { await run(`ALTER TABLE users ADD COLUMN phoneVerified INTEGER DEFAULT 0`) } catch {}
  try { await run(`ALTER TABLE users ADD COLUMN govIdVerified INTEGER DEFAULT 0`) } catch {}

  await run(`CREATE TABLE IF NOT EXISTS rides (
    id TEXT PRIMARY KEY,
    driverId TEXT NOT NULL,
    fromCity TEXT,
    toCity TEXT,
    date TEXT,
    price REAL,
    availableSeats INTEGER,
    isLadiesOnly INTEGER DEFAULT 0,
    isInstantBooking INTEGER DEFAULT 0,
    stops TEXT,
    carModel TEXT,
    distanceKm REAL,
    etaMinutes INTEGER,
    FOREIGN KEY(driverId) REFERENCES users(id) ON DELETE CASCADE
  )`)
  try { await run(`ALTER TABLE rides ADD COLUMN isLadiesOnly INTEGER DEFAULT 0`) } catch {}
  try { await run(`ALTER TABLE rides ADD COLUMN isInstantBooking INTEGER DEFAULT 0`) } catch {}
  try { await run(`ALTER TABLE rides ADD COLUMN stops TEXT`) } catch {}
  try { await run(`ALTER TABLE rides ADD COLUMN carModel TEXT`) } catch {}
  try { await run(`ALTER TABLE rides ADD COLUMN distanceKm REAL`) } catch {}
  try { await run(`ALTER TABLE rides ADD COLUMN etaMinutes INTEGER`) } catch {}
  await run(`CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    rideId TEXT NOT NULL,
    riderId TEXT NOT NULL,
    driverId TEXT NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY(rideId) REFERENCES rides(id) ON DELETE CASCADE,
    FOREIGN KEY(riderId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(driverId) REFERENCES users(id) ON DELETE CASCADE
  )`)
  await run(`CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    rideId TEXT NOT NULL,
    fromUserId TEXT NOT NULL,
    toUserId TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY(rideId) REFERENCES rides(id) ON DELETE CASCADE,
    FOREIGN KEY(fromUserId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(toUserId) REFERENCES users(id) ON DELETE CASCADE
  )`)
  await run(`CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driverId)`)
  await run(`CREATE INDEX IF NOT EXISTS idx_bookings_driver ON bookings(driverId)`)
  await run(`CREATE INDEX IF NOT EXISTS idx_bookings_rider ON bookings(riderId)`)
  const u = await get(`SELECT COUNT(*) as c FROM users`)
  const r = await get(`SELECT COUNT(*) as c FROM rides`)
  const b = await get(`SELECT COUNT(*) as c FROM bookings`)
  try {
    if (u.c === 0) {
      const users = readFile("users.json")
      for (const x of users) {
        if (x.id && x.email && x.password && x.role) {
          await run(`INSERT OR IGNORE INTO users(id,name,email,password,role) VALUES (?,?,?,?,?)`, [
            x.id,
            x.name || "",
            x.email,
            x.password,
            x.role,
          ])
        }
      }
    }
  } catch {}
  try {
    if (r.c === 0) {
      const rides = readFile("rides.json")
      for (const x of rides) {
        await run(
          `INSERT OR IGNORE INTO rides(id,driverId,fromCity,toCity,date,price,availableSeats) VALUES (?,?,?,?,?,?,?)`,
          [
            x.id,
            x.driverId,
            x.from || null,
            x.to || null,
            x.date || null,
            typeof x.price === "number" ? x.price : null,
            typeof x.availableSeats === "number" ? x.availableSeats : null,
          ]
        )
      }
    }
  } catch {}
  try {
    if (b.c === 0) {
      const bookings = readFile("bookings.json")
      for (const x of bookings) {
        await run(
          `INSERT OR IGNORE INTO bookings(id,rideId,riderId,driverId,status) VALUES (?,?,?,?,?)`,
          [x.id, x.rideId, x.riderId, x.driverId, x.status || "pending"]
        )
      }
    }
  } catch {}
}

async function tx(fn) {
  await run("BEGIN IMMEDIATE")
  try {
    const res = await fn()
    await run("COMMIT")
    return res
  } catch (e) {
    await run("ROLLBACK")
    throw e
  }
}

module.exports = { db, run, get, all, init, tx }
