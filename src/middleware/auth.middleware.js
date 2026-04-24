const jwt = require("jsonwebtoken");
const User = require("../models/User");

const secret = process.env.JWT_SECRET || "secretkey";

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, secret);
    const user = await User.findOne({ publicId: payload.sub });
    if (!user) {
      return res.status(401).json({ message: "Session is no longer valid." });
    }

    req.auth = payload;
    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

async function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null;

  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, secret);
    const user = await User.findOne({ publicId: payload.sub });
    if (user) {
      req.auth = payload;
      req.user = user;
    }
  } catch (_error) {
    // Ignore invalid tokens for optional auth
  }
  return next();
}

module.exports = { authMiddleware, optionalAuth };
