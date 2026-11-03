const express = require("express");
const cors = require("cors");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { Constants } = require("./config/constants.js");
const { dbConnect } = require("./config/database.js");
const { setSocketServer } = require("./config/socket.js");
const fs = require("fs");

const authRoutes = require("./routes/authRoutes.js");
const groupRoutes = require("./routes/groupRoutes.js");
const itemRoutes = require("./routes/itemRoutes.js");
const loanRoutes = require("./routes/loanRoutes.js");
const invitationRoutes = require("./routes/invitationRoutes.js");
const notificationRoutes = require("./routes/notificationRoutes.js");

const { notFound, errorHandler } = require("./middleware/errorMiddleware.js");

const app = express();
const httpServer = http.createServer(app);
let isShuttingDown = false;
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || Constants.CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin is not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
};
const io = new Server(httpServer, {
  cors: corsOptions,
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

app.use(cors(corsOptions));

// Create uploads directory if it doesn't exist
fs.mkdirSync(Constants.UPLOAD_DIR, { recursive: true });

app.use(express.json({ limit: Constants.BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: Constants.BODY_LIMIT }));

app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/notifications", notificationRoutes);

// Serve static files from uploads directory
app.use("/uploads", express.static(Constants.UPLOAD_DIR));

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.get("/health", (req, res) => {
  const readyState = mongoose.connection.readyState;
  res.status(readyState === 1 ? 200 : 503).json({
    success: readyState === 1,
    status: readyState === 1 ? "ok" : "unavailable",
  });
});

app.use(notFound);
app.use(errorHandler);

const shutdown = async signal => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`Received ${signal}; shutting down gracefully`);

  await new Promise(resolve => httpServer.close(() => resolve()));
  io.close();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  process.exit(0);
};

mongoose.connection.on("error", error => {
  console.error(`MongoDB connection error: ${error.message}`);
});

mongoose.connection.on("disconnected", () => {
  if (!isShuttingDown) {
    console.error("MongoDB disconnected unexpectedly");
    shutdown("MongoDB disconnect").catch(error => {
      console.error(`Shutdown failed: ${error.message}`);
      process.exit(1);
    });
  }
});

const start = async () => {
  if (!Constants.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  await dbConnect();
  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(Constants.PORT, Constants.HOST, () => {
      httpServer.removeListener("error", reject);
      console.log(`Server running at http://${Constants.HOST}:${Constants.PORT}`);
      resolve();
    });
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start().catch(error => {
  console.error(`Server startup failed: ${error.message}`);
  process.exit(1);
});
