const mongoose = require("mongoose")
const { Constants } = require("./constants");

const dbConnect = async()=>{
    try {
        await mongoose.connect(Constants.DBURL);
        console.log("Database is connected")
    }catch(err){
        console.log("DataBase is failed to connect :",err.message)
    }
}

module.exports = {dbConnect}