const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const Constants = {
  DBURL: process.env.DBURL,
  PORT: process.env.PORT,
  HOST: process.env.HOST,
  JWT_EXPIRE: process.env.JWT_EXPIRE,
  JWT_SECRET: process.env.JWT_SECRET,
};

module.exports = { Constants };
