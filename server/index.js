const express = require("express");
const { Constants } = require("./config/constants.js");
const { dbConnect } = require("./config/database.js");

const authRoutes = require("./Routes/authRoutes.js");
const groupRoutes = require("./Routes/groupRoutes.js");
const itemRoutes = require("./Routes/itemRoutes.js");
const loanRoutes = require("./Routes/loanRoutes.js");

const { notFound, errorHandler } = require("./middleware/errorMiddleware.js");

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/loans", loanRoutes);

dbConnect();

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use(notFound);
app.use(errorHandler);

app.listen(Constants.PORT, Constants.HOST, () => {
  console.log(`Server running at http://${Constants.HOST}:${Constants.PORT}`);
});