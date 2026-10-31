const dotenv = require("dotenv");
dotenv.config();
const Constants = {
    "DBURL" : process.env.DBURL,
    "PORT" : process.env.PORT,
    "HOST" : process.env.HOST,
    "JWT_EXPIRE" :process.env.JWT_EXPIRE,
    "JWT_SECRTE" : process.env.JWT_SECRTE
} ;
module.exports ={Constants};
