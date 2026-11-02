const express = require("express");
const { Constants } = require("./config/constants.js");
const { dbConnect } = require("./config/database.js");
const authRoutes = require("./routes/authRoutes.js");
const { notFound, errorHandler } = require("./middleware/errorMiddleware.js");

const app = express();

// Enable CORS for local network and cross-origin access
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());
app.use("/api/auth", authRoutes);

dbConnect();

app.get("/", (req, res) => {
    res.send("Server is running");
});

app.use(notFound);
app.use(errorHandler);

app.listen(Constants.PORT, Constants.HOST, () => {
    console.log(`Server running at http://${Constants.HOST}:${Constants.PORT}`);
});
