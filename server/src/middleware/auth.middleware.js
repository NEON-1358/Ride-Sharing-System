const jwt = require("jsonwebtoken");
const { getUserModel } = require("../models/User");
const userStore = require("../utils/userStore");

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

  const User = getUserModel();

  const user = User
    ? await User.findOne({ publicId: payload.sub })
    : await userStore.findByPublicId(payload.sub);

  if (!user) {
    return res.status(401).json({
      message: "Session is no longer valid."
    });
  }

  req.auth = payload;
  req.user = user;

  return next();

} catch (error) {
  console.error("Auth middleware error:", error);

  return res.status(401).json({
    message: "Invalid or expired token."
  });
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

  const User = getUserModel();

  const user = User
    ? await User.findOne({ publicId: payload.sub })
    : await userStore.findByPublicId(payload.sub);

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
