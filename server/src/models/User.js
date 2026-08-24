const { mongoose } = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const isMongoAvailable = () => Boolean(process.env.MONGO_URI);

const UserSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.Mixed,
      default: uuidv4,
    },
    publicId: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      default: null,
    },
    googleId: {
      type: String,
      default: null,
      index: true,
    },
    profilePictureUrl: {
      type: String,
      default: "",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    totalRidesParticipated: {
      type: Number,
      default: 0,
      min: 0,
    },
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    // Compatibility fields for existing data
    role: {
      type: String,
      default: "Client",
    },
    password: {
      type: String,
      default: null,
    },
    profilePic: {
      type: String,
      default: "",
    },
    chattiness: {
      type: String,
      default: "BlaBla",
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    govIdVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, strict: false }
);

UserSchema.index({ email: 1 });
UserSchema.index({ googleId: 1 });

const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);

function getUserModel() {
  if (isMongoAvailable()) {
    return UserModel;
  }

  return null;
}

module.exports = { UserModel, getUserModel };
