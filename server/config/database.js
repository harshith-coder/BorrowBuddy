const mongoose = require("mongoose");
const { Constants } = require("../config/constants.js");

const dbConnect = async()=>{
    if (!Constants.DBURL) {
        throw new Error("DBURL is not configured");
    }

    await mongoose.connect(Constants.DBURL);
    console.log("Database is connected");
}

module.exports = {dbConnect};