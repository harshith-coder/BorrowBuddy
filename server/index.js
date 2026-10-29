const express = require("express");
const {Constants} = require("./config/constants.js");
const {dbConnect} = require("./config/database.js");
app = express();
dbConnect();
app.listen(Constants.PORT,Constants.HOST,()=>{
    try{
        console.log("server is running");
    }catch(err){
        console.log("server failed to start : ",err.message);
    }
});

