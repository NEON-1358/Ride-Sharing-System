const mongoose = require("mongoose");

async function connectMongo(uri) {
  if (!uri) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(uri);
  return mongoose.connection;
}

module.exports = { mongoose, connectMongo };
