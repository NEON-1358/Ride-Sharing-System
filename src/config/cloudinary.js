const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
const apiKey = process.env.CLOUDINARY_API_KEY || "";
const apiSecret = process.env.CLOUDINARY_API_SECRET || "";

const hasValidCloudinaryConfig =
  Boolean(cloudName && apiKey && apiSecret) &&
  cloudName !== "root" &&
  !cloudName.startsWith("placeholder_");

let storage;

if (hasValidCloudinaryConfig) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "rideshare_profiles",
      allowedFormats: ["jpeg", "png", "jpg", "webp"],
    },
  });
} else {
  const uploadsDir = path.join(__dirname, "../../data/uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, name);
    },
  });
}

const upload = multer({ storage });

module.exports = { cloudinary, upload, hasValidCloudinaryConfig };
