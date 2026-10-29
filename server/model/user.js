const mongoose = require("mongoose")


const userSchema = mongoose.Schema({
    fristname :{
        type : String,

    },
    secondname :{
        type : String
    },
    email :{
        type : String,
        unique : true
    },
    password :{
        type : String
    },
    timestamp : true
    
});

const User  = mongoose.model("User",userSchema)

module.exports = {User}