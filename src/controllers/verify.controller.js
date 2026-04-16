const { run } = require("../db")
const { get } = require("../db")

async function setFlag(userId, field) {
  const col = field === "email" ? "emailVerified" : field === "phone" ? "phoneVerified" : "govIdVerified"
  await run(`UPDATE users SET ${col} = 1 WHERE id = ?`, [userId])
  const u = await get(`SELECT id,name,email,role,${col} FROM users WHERE id = ?`, [userId])
  return u
}

exports.confirmEmail = async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" })
  try {
    const u = await setFlag(req.user.id, "email")
    res.json({ ok: true, user: u })
  } catch {
    res.status(500).json({ message: "Server error" })
  }
}

exports.confirmPhone = async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" })
  try {
    const u = await setFlag(req.user.id, "phone")
    res.json({ ok: true, user: u })
  } catch {
    res.status(500).json({ message: "Server error" })
  }
}

exports.confirmGovId = async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" })
  try {
    const u = await setFlag(req.user.id, "gov")
    res.json({ ok: true, user: u })
  } catch {
    res.status(500).json({ message: "Server error" })
  }
}
