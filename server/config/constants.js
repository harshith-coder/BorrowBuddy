const dotenv = require("dotenv");
dotenv.config();
const Constants = {
    "DBURL" : process.env.DBURL,
    "PORT" : process.env.PORT,
    "HOST" : process.env.HOST
} ;
module.exports ={Constants};
