const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const Constants = {
  NODE_ENV: process.env.NODE_ENV || "development",
  DBURL: process.env.DBURL,
  PORT: Number(process.env.PORT) || 3000,
  HOST: process.env.HOST || "0.0.0.0",
  CORS_ORIGINS: (process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  JWT_EXPIRE: process.env.JWT_EXPIRE,
  JWT_SECRET: process.env.JWT_SECRET,
  BODY_LIMIT: process.env.BODY_LIMIT || "1mb",
  UPLOAD_DIR: path.resolve(process.env.UPLOAD_DIR || path.resolve(__dirname, "../uploads")),
};

module.exports = { Constants };