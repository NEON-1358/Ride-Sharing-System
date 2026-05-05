const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const User = require("../models/User");
const Review = require("../models/Review");
const { toReview, toUserProfile } = require("../utils/serializers");

const secret = process.env.JWT_SECRET || "secretkey";

const signupSchema = Joi.object({
  name: Joi.string().trim().min(3).max(50).required().messages({
    'string.min': 'Name must be at least 3 characters',
    'any.required': 'Name is required'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'any.required': 'Password is required'
  }),
});

const profileSchema = Joi.object({
  name: Joi.string().trim().min(3).max(50).optional().messages({
    'string.min': 'Name must be at least 3 characters'
  }),
});

function issueToken(user) {
  return jwt.sign(
    {
      sub: user.publicId,
      email: user.email,
      isAdmin: Boolean(user.isAdmin),
    },
    secret,
    { expiresIn: "7d" }
  );
}

function authResponse(user) {
  return {
    token: issueToken(user),
    user: toUserProfile(user),
  };
}

async function profilePayload(userId) {
  const user = await User.findOne({ publicId: userId });
  if (!user) return null;

  const reviews = await Review.find({ reviewee: user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("reviewer");

  return {
    user: toUserProfile(user),
    reviews: reviews.map(toReview),
  };
}

exports.signup = async (req, res) => {
  const { error, value } = signupSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      message: error.details.map((detail) => detail.message).join(" "),
    });
  }

  try {
    const existing = await User.findOne({ email: value.email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: "An account with that email already exists." });
    }

    const passwordHash = await bcrypt.hash(value.password, 10);
    const user = await User.create({
      name: value.name.trim(),
      email: value.email.toLowerCase().trim(),
      passwordHash,
      profilePictureUrl: req.file ? req.file.path : "",
    });

    return res.status(201).json(authResponse(user));
  } catch (_error) {
    return res.status(500).json({ message: "Unable to create account right now." });
  }
};

exports.login = async (req, res) => {
  return res.json(authResponse(req.user));
};

exports.googleCallback = async (req, res, next) => {
  const state = req.query.state || "login";
  const redirectPath = state === "signup" ? "/signup" : "/login";

  try {
    if (!req.user) {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return res.redirect(`${frontendUrl}${redirectPath}?error=no_user_from_google`);
    }
    const token = issueToken(req.user);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return res.redirect(`${frontendUrl}/oauth/callback?token=${encodeURIComponent(token)}`);
  } catch (err) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return res.redirect(`${frontendUrl}${redirectPath}?error=google_callback_failed`);
  }
};

exports.getMe = async (req, res) => {
  const payload = await profilePayload(req.user.publicId);
  if (!payload) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json(payload);
};

exports.getProfile = async (req, res) => {
  const payload = await profilePayload(req.params.userId);
  if (!payload) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json(payload);
};

exports.updateProfile = async (req, res) => {
  const { error, value } = profileSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      message: error.details.map((detail) => detail.message).join(" "),
    });
  }

  try {
    const update = {};
    if (value.name) {
      update.name = value.name.trim();
    }
    if (req.file) {
      update.profilePictureUrl = req.file.path || req.file.filename;
    }

    const user = await User.findOneAndUpdate(
      { publicId: req.user.publicId },
      { $set: update },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const payload = await profilePayload(user.publicId);
    return res.json(payload);
  } catch (error) {
    console.error("updateProfile error:", error);
    return res.status(500).json({ message: "Unable to update your profile right now.", error: error.message });
  }
};
