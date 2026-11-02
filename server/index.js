const express = require("express");
const cors = require("cors");
const { Constants } = require("./config/constants.js");
const { dbConnect } = require("./config/database.js");

const authRoutes = require("./Routes/authRoutes.js");
const groupRoutes = require("./Routes/groupRoutes.js");
const itemRoutes = require("./Routes/itemRoutes.js");
const loanRoutes = require("./Routes/loanRoutes.js");

const { notFound, errorHandler } = require("./middleware/errorMiddleware.js");

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"]
}));

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)){
  fs.mkdirSync(uploadsDir);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/loans", loanRoutes);

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

dbConnect();

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use(notFound);
app.use(errorHandler);

app.listen(Constants.PORT, Constants.HOST, () => {
  console.log(`Server running at http://${Constants.HOST}:${Constants.PORT}`);
});