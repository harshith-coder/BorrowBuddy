const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const Constants = {
  DBURL: process.env.DBURL || process.env.MONGODB_URI,
  PORT: process.env.PORT || 5000,
  HOST: process.env.HOST || "localhost",
  JWT_EXPIRE: process.env.JWT_EXPIRE || "30d",
  JWT_SECRET: process.env.JWT_SECRET,
};

module.exports = { Constants };
