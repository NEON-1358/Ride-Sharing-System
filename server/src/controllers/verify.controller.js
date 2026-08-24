const { getUserModel } = require("../models/User")
const userStore = require("../utils/userStore")

async function setField(userId, field) {
  const update = {}
  if (field === "email") update.emailVerified = true
  else if (field === "phone") update.phoneVerified = true
  else update.govIdVerified = true
  await User.updateOne({ _id: userId }, { $set: update })
  const u = await User.findById(userId).select("name email role emailVerified phoneVerified govIdVerified").lean()
  return u
}

exports.confirmEmail = async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" })
  try {
    const u = await setField(req.user.id, "email")
    res.json({ ok: true, user: u })
  } catch {
    res.status(500).json({ message: "Server error" })
  }
}

exports.confirmPhone = async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" })
  try {
    const u = await setField(req.user.id, "phone")
    res.json({ ok: true, user: u })
  } catch {
    res.status(500).json({ message: "Server error" })
  }
}

exports.confirmGovId = async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" })
  try {
    const u = await setField(req.user.id, "gov")
    res.json({ ok: true, user: u })
  } catch {
    res.status(500).json({ message: "Server error" })
  }
}
