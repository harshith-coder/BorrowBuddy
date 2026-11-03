const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { Constants } = require("./config/constants.js");
const { dbConnect } = require("./config/database.js");
const { setSocketServer } = require("./config/socket.js");

const authRoutes = require("./routes/authRoutes.js");
const groupRoutes = require("./routes/groupRoutes.js");
const itemRoutes = require("./routes/itemRoutes.js");
const loanRoutes = require("./routes/loanRoutes.js");
const invitationRoutes = require("./routes/invitationRoutes.js");
const notificationRoutes = require("./routes/notificationRoutes.js");

const { notFound, errorHandler } = require("./middleware/errorMiddleware.js");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication required"));

  try {
    socket.userId = jwt.verify(token, Constants.JWT_SECRET).id;
    next();
  } catch (error) {
    next(new Error("Invalid authentication token"));
  }
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.userId}`);
});
setSocketServer(io);

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
app.use("/api/invitations", invitationRoutes);
app.use("/api/notifications", notificationRoutes);

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

dbConnect();

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use(notFound);
app.use(errorHandler);

httpServer.listen(Constants.PORT, Constants.HOST, () => {
  console.log(`Server running at http://${Constants.HOST}:${Constants.PORT}`);
});
