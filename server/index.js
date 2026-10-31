const express = require("express");
const { Constants } = require("./config/constants.js");
const { dbConnect } = require("./config/database.js");
const authRoutes = require("./routes/authRoutes.js");
const { notFound, errorHandler } = require("./middleware/errorMiddleware.js");
const app = express();

app.use(express.json());
app.use("/api/auth", authRoutes);

dbConnect();
app.get("/", (req, res) => {
    res.send("Server is running");
});

app.use(notFound);
app.use(errorHandler);

app.listen(Constants.PORT, Constants.HOST, () => {
    console.log("Server is running");
});